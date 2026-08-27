import type { ModuleConfig } from './config.js'
import { TransportState } from './types.js'
import type {
	ServerMessage,
	ClientFrame,
	CueStateMessage,
	PlaybackSnapshotMessage,
	MeterMessage,
	DocPatchMessage,
	SelectionMessage,
} from './types.js'

export { TransportState }
export type {
	ServerMessage,
	ClientFrame,
	CueStateMessage,
	PlaybackSnapshotMessage,
	MeterMessage,
	DocPatchMessage,
	SelectionMessage,
}

export class LivePlayWebSocket {
	private ws: WebSocket | null = null
	private config: ModuleConfig
	private reconnectAttempts = 0
	private maxReconnectAttempts = 5
	private reconnectDelay = 1000
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private isConnected = false
	private messageHandlers: Map<string, (data: ServerMessage) => void> = new Map()
	private connectionHandlers: Array<(connected: boolean) => void> = []
	private isDestroyed = false
	private moduleLog: ((level: 'info' | 'warn' | 'error' | 'debug', message: string) => void) | null = null

	constructor(config: ModuleConfig) {
		this.config = config
	}

	setLogger(logger: (level: 'info' | 'warn' | 'error' | 'debug', message: string) => void): void {
		this.moduleLog = logger
	}

	connect(): void {
		if (this.isDestroyed || this.isConnected) {
			return
		}

		try {
			const wsUrl = `ws://${this.config.host}:${this.config.port}/ws`
			this.ws = new WebSocket(wsUrl)

			this.ws.onopen = () => {
				this.isConnected = true
				this.reconnectAttempts = 0
				this.log('info', 'WebSocket connected')
				this.notifyConnectionHandlers(true)
			}

			this.ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data) as ServerMessage
					this.handleMessage(message)
				} catch (_error) {
					this.log('error', `Failed to parse WebSocket message`)
				}
			}

			this.ws.onclose = (event) => {
				this.isConnected = false
				this.log('warn', `WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`)
				this.notifyConnectionHandlers(false)
				this.reconnect()
			}

			this.ws.onerror = () => {
				this.log('error', 'WebSocket error')
			}
		} catch (error) {
			this.log('error', `Failed to connect to WebSocket: ${error}`)
			this.reconnect()
		}
	}

	disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		if (this.ws) {
			this.ws.close()
			this.ws = null
		}

		this.isConnected = false
		this.notifyConnectionHandlers(false)
	}

	private reconnect(): void {
		if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.log('error', 'Max reconnection attempts reached')
			return
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
		}

		this.reconnectAttempts++
		const delay = this.reconnectDelay * this.reconnectAttempts

		this.log(
			'info',
			`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
		)

		this.reconnectTimer = setTimeout(() => {
			this.connect()
		}, delay)
	}

	private handleMessage(message: ServerMessage): void {
		if (this.config.debugLogging) {
			this.log('debug', `Received WebSocket message: ${JSON.stringify(message)}`)
		}

		const handler = this.messageHandlers.get(message.type)
		if (handler) {
			try {
				handler(message)
			} catch (_error) {
				this.log('error', `Error in message handler for ${message.type}`)
			}
		}
	}

	send(frame: ClientFrame): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.log('warn', `Cannot send frame: WebSocket not connected`)
			return
		}

		if (this.config.debugLogging) {
			this.log('debug', `Sending WebSocket frame: ${JSON.stringify(frame)}`)
		}

		this.ws.send(JSON.stringify(frame))
	}

	onMessage(type: string, handler: (data: ServerMessage) => void): void {
		this.messageHandlers.set(type, handler)
	}

	onConnectionChange(handler: (connected: boolean) => void): void {
		this.connectionHandlers.push(handler)
	}

	private notifyConnectionHandlers(connected: boolean): void {
		this.connectionHandlers.forEach((handler) => {
			try {
				handler(connected)
			} catch (_error) {
				this.log('error', `Error in connection handler`)
			}
		})
	}

	isConnectedToServer(): boolean {
		return this.isConnected
	}

	private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
		if (this.moduleLog) {
			this.moduleLog(level, message)
		} else {
			console.log(`[LivePlay WebSocket ${level.toUpperCase()}] ${message}`)
		}
	}

	destroy(): void {
		this.isDestroyed = true

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		this.disconnect()
		this.messageHandlers.clear()
		this.connectionHandlers.length = 0
	}
}
