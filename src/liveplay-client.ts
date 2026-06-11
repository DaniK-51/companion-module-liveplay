import type { ModuleConfig } from './config.js'

export interface LivePlayHealthResponse {
	ok: boolean
	name: string
}

export interface LivePlayProjectHeader {
	name: string
	itemCount: number
	theme?: Record<string, unknown>
	settings?: Record<string, unknown>
	cart?: unknown[]
	hasOpenProject?: boolean
}

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
