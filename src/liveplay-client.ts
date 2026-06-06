import type { ModuleConfig } from './config.js'

export interface LivePlayCue {
	id: string
	display_name: string
	file_path: string
	artist: string
	title: string
	duration_sec: number
	gain_db: number
	transport: number // 0=Stopped, 1=Playing, 2=FadingOut, 3=Paused
}

export interface LivePlayProject {
	name: string
	items: LivePlayCue[]
	groups: any[]
	cart: any[]
	routing: any[]
	theme: any
	settings: any
}

export interface LivePlayDevice {
	id: string
	name: string
	sample_rate: number
	channels: number
	state: string // 'open', 'closed'
}

export interface LivePlayMixer {
	id: string
	name: string
	channels: number
	volume: number
	mute: boolean
	solo: boolean
}

export interface LivePlayMeterData {
	timestamp: number
	meters: {
		input: number[]
		output: number[]
		master: number[]
	}
}

export class LivePlayApiClient {
	private config: ModuleConfig
	private isDestroyed = false

	constructor(config: ModuleConfig) {
		this.config = config
	}

	private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `http://${this.config.host}:${this.config.port}${endpoint}`
		
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.config.connectionTimeout)

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/json',
					...options.headers,
				},
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			return await response.json()
		} catch (error) {
			clearTimeout(timeoutId)
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request timeout')
			}
			throw error
		}
	}

	// Health check
	async checkHealth(): Promise<boolean> {
		try {
			await this.makeRequest('/api/health')
			return true
		} catch (error) {
			return false
		}
	}

	// Device management
	async getDevices(): Promise<LivePlayDevice[]> {
		return this.makeRequest<LivePlayDevice[]>('/api/devices')
	}

	async openDevice(deviceId: string): Promise<void> {
		await this.makeRequest(`/api/devices/${deviceId}/open`, {
			method: 'POST',
		})
	}

	async closeDevice(deviceId: string): Promise<void> {
		await this.makeRequest(`/api/devices/${deviceId}/close`, {
			method: 'POST',
		})
	}

	// Project management
	async getProject(): Promise<LivePlayProject> {
		return this.makeRequest<LivePlayProject>('/api/project')
	}

	async loadProject(projectPath: string): Promise<void> {
		await this.makeRequest('/api/project/load', {
			method: 'POST',
			body: JSON.stringify({ path: projectPath }),
		})
	}

	async saveProject(): Promise<void> {
		await this.makeRequest('/api/project/save', {
			method: 'POST',
		})
	}

	async refreshProject(): Promise<void> {
		await this.makeRequest('/api/project/refresh', {
			method: 'POST',
		})
	}

	// Cue control
	async playCue(cueId: string, useUuid: boolean = true, fadeMs: number = 0): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/play`, {
			method: 'POST',
			body: JSON.stringify({ fade_ms: fadeMs }),
		})
	}

	async stopCue(cueId: string, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/stop`, {
			method: 'POST',
		})
	}

	async pauseCue(cueId: string, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/pause`, {
			method: 'POST',
		})
	}

	async resumeCue(cueId: string, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/resume`, {
			method: 'POST',
		})
	}

	async seekCue(cueId: string, position: number, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/seek`, {
			method: 'POST',
			body: JSON.stringify({ position }),
		})
	}

	async setCueGain(cueId: string, gainDb: number, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/gain`, {
			method: 'POST',
			body: JSON.stringify({ gain_db: gainDb }),
		})
	}

	async setCueFadeIn(cueId: string, fadeMs: number, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/fade_in`, {
			method: 'POST',
			body: JSON.stringify({ fade_ms: fadeMs }),
		})
	}

	async setCueFadeOut(cueId: string, fadeMs: number, useUuid: boolean = true): Promise<void> {
		const endpoint = useUuid ? `item_uuid/${cueId}` : `cue_id/${cueId}`
		await this.makeRequest(`/api/project/items/${endpoint}/fade_out`, {
			method: 'POST',
			body: JSON.stringify({ fade_ms: fadeMs }),
		})
	}

	// Transport controls
	async stopAll(): Promise<void> {
		await this.makeRequest('/api/transport/stop_all', {
			method: 'POST',
		})
	}

	async play(): Promise<void> {
		await this.makeRequest('/api/transport/play', {
			method: 'POST',
		})
	}

	async pause(): Promise<void> {
		await this.makeRequest('/api/transport/pause', {
			method: 'POST',
		})
	}

	async next(): Promise<void> {
		await this.makeRequest('/api/transport/next', {
			method: 'POST',
		})
	}

	async previous(): Promise<void> {
		await this.makeRequest('/api/transport/previous', {
			method: 'POST',
		})
	}

	// Master controls
	async setMasterGain(gainDb: number): Promise<void> {
		await this.makeRequest('/api/master/gain', {
			method: 'POST',
			body: JSON.stringify({ gain_db: gainDb }),
		})
	}

	// Mixer controls
	async getMixers(): Promise<LivePlayMixer[]> {
		return this.makeRequest<LivePlayMixer[]>('/api/mixers')
	}

	async createMixer(name: string, channels: number = 2): Promise<LivePlayMixer> {
		return this.makeRequest<LivePlayMixer>('/api/mixers', {
			method: 'POST',
			body: JSON.stringify({ name, channels }),
		})
	}

	async setMixerVolume(mixerId: string, volume: number): Promise<void> {
		await this.makeRequest(`/api/mixers/${mixerId}/volume`, {
			method: 'POST',
			body: JSON.stringify({ volume }),
		})
	}

	async setMute(mixerId: string, mute: boolean): Promise<void> {
		await this.makeRequest(`/api/mixers/${mixerId}/mute`, {
			method: 'POST',
			body: JSON.stringify({ mute }),
		})
	}

	async setSolo(mixerId: string, solo: boolean): Promise<void> {
		await this.makeRequest(`/api/mixers/${mixerId}/solo`, {
			method: 'POST',
			body: JSON.stringify({ solo }),
		})
	}

	// Cart controls
	async playCart(slot: number): Promise<void> {
		await this.makeRequest('/api/cart/play', {
			method: 'POST',
			body: JSON.stringify({ slot }),
		})
	}

	async clearCart(slot: number): Promise<void> {
		await this.makeRequest('/api/cart/clear', {
			method: 'POST',
			body: JSON.stringify({ slot }),
		})
	}

	// Cleanup
	destroy(): void {
		this.isDestroyed = true
	}
}