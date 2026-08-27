import type { ModuleConfig } from './config.js'
import type {
	LivePlayHealthResponse,
	LivePlayProjectHeader,
	LivePlayProject,
	LivePlayCue,
	LivePlayMixer,
	LivePlayDevice,
} from './types.js'

export class LivePlayApiClient {
	private config: ModuleConfig

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

			return (await response.json()) as T
		} catch (error) {
			clearTimeout(timeoutId)
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request timeout')
			}
			throw error
		}
	}

	async checkHealth(): Promise<boolean> {
		try {
			const result = await this.makeRequest<LivePlayHealthResponse>('/api/health')
			return result.ok === true
		} catch (_error) {
			return false
		}
	}

	async getProjectHeader(): Promise<LivePlayProjectHeader | null> {
		try {
			return await this.makeRequest<LivePlayProjectHeader>('/api/project/header')
		} catch (_error) {
			return null
		}
	}

	async getProject(): Promise<LivePlayProject | null> {
		try {
			return await this.makeRequest<LivePlayProject>('/api/project')
		} catch (_error) {
			return null
		}
	}

	async getCues(): Promise<LivePlayCue[]> {
		try {
			return await this.makeRequest<LivePlayCue[]>('/api/cues')
		} catch (_error) {
			return []
		}
	}

	async getMixers(): Promise<LivePlayMixer[]> {
		try {
			return await this.makeRequest<LivePlayMixer[]>('/api/mixers')
		} catch (_error) {
			return []
		}
	}

	async getDevices(): Promise<LivePlayDevice[]> {
		try {
			return await this.makeRequest<LivePlayDevice[]>('/api/devices')
		} catch (_error) {
			return []
		}
	}

	async getMasterGain(): Promise<number> {
		try {
			const result = await this.makeRequest<{ db: number }>('/api/master/gain')
			return result.db
		} catch (_error) {
			return 0
		}
	}

	async setMasterGain(db: number): Promise<void> {
		await this.makeRequest('/api/master/gain', {
			method: 'POST',
			body: JSON.stringify({ db }),
		})
	}

	destroy(): void {
		// No persistent resources to clean up
	}
}
