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
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private reconnectDelay = 1500
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

	private get wsUrl(): string {
		return `ws://${this.config.host}:${this.config.port}/ws`
	}

	connect(): void {
		if (this.isDestroyed) return

		// Don't create duplicate connections
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
			return
		}

		try {
			this.log('info', `Connecting to ${this.wsUrl}`)
			this.ws = new WebSocket(this.wsUrl)

			this.ws.onopen = () => {
				this.isConnected = true
				this.reconnectDelay = 1500 // reset backoff
				this.log('info', 'WebSocket connected')
				this.notifyConnectionHandlers(true)
			}

			this.ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data) as ServerMessage
					this.handleMessage(message)
				} catch (_error) {
					this.log('error', 'Failed to parse WebSocket message')
				}
			}

			this.ws.onclose = (event) => {
				const wasConnected = this.isConnected
				this.isConnected = false
				this.ws = null
				if (wasConnected) {
					this.log('warn', `WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`)
					this.notifyConnectionHandlers(false)
				}
				this.scheduleReconnect()
			}

			this.ws.onerror = () => {
				this.log('error', 'WebSocket error')
				// onerror is followed by onclose; reconnection happens there
			}
		} catch (error) {
			this.log('error', `Failed to create WebSocket: ${error}`)
			this.scheduleReconnect()
		}
	}

	private scheduleReconnect(): void {
		if (this.isDestroyed || this.reconnectTimer) return

		this.log('info', `Reconnecting in ${this.reconnectDelay}ms`)
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000) // exponential backoff, max 10s
			this.connect()
		}, this.reconnectDelay)
	}

	disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		if (this.ws) {
			// Clear handlers to prevent reconnect on intentional disconnect
			this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null
			try {
				this.ws.close()
			} catch {
				/* ignore close errors */
			}
			this.ws = null
		}

		if (this.isConnected) {
			this.isConnected = false
			this.notifyConnectionHandlers(false)
		}
	}

	private handleMessage(message: ServerMessage): void {
		if (this.config.debugLogging) {
			this.log('debug', `WS recv: ${message.type}`)
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
			this.log('warn', `Cannot send: WebSocket not connected (readyState=${this.ws?.readyState ?? 'null'})`)
			return
		}

		if (this.config.debugLogging) {
			this.log('debug', `WS send: ${frame.type}`)
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
				this.log('error', 'Error in connection handler')
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
			console.log(`[LivePlay WS ${level.toUpperCase()}] ${message}`)
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
