import type { ModuleConfig } from './config.js'

// Transport state values from LivePlay server
export enum TransportState {
	Stopped = 0,
	Playing = 1,
	FadingOut = 2,
	Paused = 3,
}

// Server → client frames
export interface CueStateMessage {
	type: 'cue_state'
	cue_id: string
	transport: TransportState
	playhead_seconds: number
	item_uuid?: string
}

export interface PlaybackSnapshotMessage {
	type: 'playback_snapshot'
	cues: Array<{
		cue_id: string
		transport: TransportState
		playhead_seconds: number
		item_uuid?: string
	}>
	next_item_uuid?: string
	master_gain_db: number
	output_channel_gains?: Array<{ channel: number; db: number }>
	preview?: { item_uuid: string; cue_id: string }
}

export interface MeterChannel {
	peak_db: number
	rms_db: number
}

export interface MeterItem {
	cue_id: string
	transport: TransportState
	playhead_seconds: number
	sources: MeterChannel[]
}

export interface MeterMessage {
	type: 'meters'
	items: MeterItem[]
	mixer_channels: Array<{ mixer_id: string; peak_db: number; rms_db: number }>
	master_channels: Array<{ index: number; peak_db: number; rms_db: number; gain_reduction_db: number }>
}

export interface DocPatchMessage {
	type: 'doc_patch'
	op: string
	[key: string]: unknown
}

export interface PongMessage {
	type: 'pong'
}

export interface ErrorMessage {
	type: 'error'
	message: string
}

export type ServerMessage =
	| CueStateMessage
	| PlaybackSnapshotMessage
	| MeterMessage
	| DocPatchMessage
	| PongMessage
	| ErrorMessage

// Client → server frames
export interface PlayFrame {
	type: 'play'
	item_uuid?: string
	cue_id?: string
}

export interface StopFrame {
	type: 'stop'
	item_uuid?: string
	cue_id?: string
}

export interface PauseFrame {
	type: 'pause'
	item_uuid?: string
	cue_id?: string
}

export interface ResumeFrame {
	type: 'resume'
	item_uuid?: string
	cue_id?: string
}

export interface SeekFrame {
	type: 'seek'
	item_uuid?: string
	cue_id?: string
	seconds: number
}

export interface GainFrame {
	type: 'gain'
	item_uuid?: string
	cue_id?: string
	db: number
}

export interface FadeFrame {
	type: 'fade'
	item_uuid?: string
	cue_id?: string
	in_ms: number
	out_ms: number
}

export interface StopAllFrame {
	type: 'stop_all'
	fade_ms?: number
}

export interface SetNextItemFrame {
	type: 'set_next_item'
	item_uuid?: string
}

export interface PingFrame {
	type: 'ping'
}

export type ClientFrame =
	| PlayFrame
	| StopFrame
	| PauseFrame
	| ResumeFrame
	| SeekFrame
	| GainFrame
	| FadeFrame
	| StopAllFrame
	| SetNextItemFrame
	| PingFrame

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
