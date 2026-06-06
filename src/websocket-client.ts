import type { ModuleConfig } from './config.js'
import type { LivePlayMeterData } from './liveplay-client.js'

export interface WebSocketMessage {
	type: string
	data?: any
	timestamp?: number
}

export interface CueStateMessage {
	type: 'cue_state'
	uuid: string
	state: 'stopped' | 'playing' | 'paused' | 'fading_out'
	position?: number
}

export interface PlaybackSnapshotMessage {
	type: 'playback_snapshot'
	cues: Array<{
		uuid: string
		state: string
		position: number
		duration: number
	}>
	master_volume: number
}

export interface DocPatchMessage {
	type: 'doc_patch'
	operations: Array<{
		op: string
		path: string
		value?: any
	}>
}

export interface MeterMessage {
	type: 'meters'
	data: LivePlayMeterData
}

export type LivePlayWebSocketMessage = 
	| CueStateMessage
	| PlaybackSnapshotMessage
	| DocPatchMessage
	| MeterMessage
	| WebSocketMessage

export class LivePlayWebSocket {
	private ws: WebSocket | null = null
	private config: ModuleConfig
	private reconnectAttempts = 0
	private maxReconnectAttempts = 5
	private reconnectDelay = 1000
	private reconnectTimer: NodeJS.Timeout | null = null
	private isConnected = false
	private messageHandlers: Map<string, (data: any) => void> = new Map()
	private connectionHandlers: Array<(connected: boolean) => void> = []
	private isDestroyed = false

	constructor(config: ModuleConfig) {
		this.config = config
	}

	// Connection management
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
					const message = JSON.parse(event.data) as LivePlayWebSocketMessage
					this.handleMessage(message)
				} catch (error) {
					this.log('error', `Failed to parse WebSocket message: ${error}`)
				}
			}

			this.ws.onclose = (event) => {
				this.isConnected = false
				this.log('warn', `WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`)
				this.notifyConnectionHandlers(false)
				this.reconnect()
			}

			this.ws.onerror = (error) => {
				this.log('error', 'WebSocket error')
				// Don't attempt to reconnect here, onclose will handle it
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
		
		this.log('info', `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
		
		this.reconnectTimer = setTimeout(() => {
			this.connect()
		}, delay)
	}

	// Message handling
	private handleMessage(message: LivePlayWebSocketMessage): void {
		if (this.config.debugLogging) {
			this.log('debug', `Received WebSocket message: ${JSON.stringify(message)}`)
		}

		const handler = this.messageHandlers.get(message.type)
		if (handler) {
			try {
				handler(message.data || message)
			} catch (error) {
				this.log('error', `Error in message handler for ${message.type}: ${error}`)
			}
		}
	}

	// Event handlers
	onMessage(type: string, handler: (data: any) => void): void {
		this.messageHandlers.set(type, handler)
	}

	onConnectionChange(handler: (connected: boolean) => void): void {
		this.connectionHandlers.push(handler)
	}

	private notifyConnectionHandlers(connected: boolean): void {
		this.connectionHandlers.forEach(handler => {
			try {
				handler(connected)
			} catch (error) {
				this.log('error', `Error in connection handler: ${error}`)
			}
		})
	}

	// Utility methods
	isConnectedToServer(): boolean {
		return this.isConnected
	}

	getReconnectAttempts(): number {
		return this.reconnectAttempts
	}

	// Logging helper
	private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
		// This will be replaced with actual logger when integrated with main module
		console.log(`[LivePlay WebSocket ${level.toUpperCase()}] ${message}`)
	}

	// Cleanup
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