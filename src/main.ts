import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, UpdateVariables, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { LivePlayApiClient } from './liveplay-client.js'
import { LivePlayWebSocket } from './websocket-client.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	apiClient: LivePlayApiClient | null = null
	webSocketClient: LivePlayWebSocket | null = null
	connectionStatus: InstanceStatus = InstanceStatus.Ok
	updateIntervalId: NodeJS.Timeout | null = null
	playingCues = new Set<string>()
	currentPlayerState = {
		state: 'stopped',
		position: 0,
		duration: 0,
		progress: 0,
		masterVolume: 0,
		currentCue: null as string | null,
	}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		// Initialize API client
		this.apiClient = new LivePlayApiClient(config)

		// Initialize WebSocket client
		this.webSocketClient = new LivePlayWebSocket(config)
		this.setupWebSocketHandlers()

		// Start connection monitoring
		void this.startConnectionMonitoring()

		// Start update loop
		this.startUpdateLoop()

		this.updateStatus(InstanceStatus.Ok)
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
	}

	private setupWebSocketHandlers(): void {
		if (!this.webSocketClient) return

		this.webSocketClient.onConnectionChange((connected) => {
			if (connected) {
				this.updateStatus(InstanceStatus.Ok)
				this.log('info', 'Connected to LivePlay server')
			} else {
				this.updateStatus(InstanceStatus.Connecting)
				this.log('warn', 'Disconnected from LivePlay server')
			}
		})

		this.webSocketClient.onMessage('cue_state', (data) => {
			this.handleCueStateUpdate(data)
		})

		this.webSocketClient.onMessage('playback_snapshot', (data) => {
			this.handlePlaybackSnapshot(data)
		})

		this.webSocketClient.onMessage('meters', (data) => {
			this.handleMeterUpdate(data)
		})

		this.webSocketClient.onMessage('doc_patch', (data) => {
			this.handleDocPatch(data)
		})
	}

	private async startConnectionMonitoring(): Promise<void> {
		const checkConnection = async () => {
			try {
				if (this.apiClient && this.connectionStatus !== InstanceStatus.Ok) {
					const isHealthy = await this.apiClient.checkHealth()
					if (isHealthy) {
						this.updateStatus(InstanceStatus.Ok)
						if (this.webSocketClient) {
							this.webSocketClient.connect()
						}
					} else {
						this.updateStatus(InstanceStatus.Connecting)
					}
				}
			} catch (error) {
				if (this.connectionStatus !== InstanceStatus.Connecting) {
					this.updateStatus(InstanceStatus.Connecting)
				}
				if (this.config.debugLogging) {
					this.log('debug', `Connection check failed: ${error}`)
				}
			}
		}

		// Check connection immediately
		await checkConnection()

		// Set up periodic connection checks
		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
		}

		this.updateIntervalId = setInterval(() => {
			void checkConnection()
		}, 30000) // Check every 30 seconds
	}

	private startUpdateLoop(): void {
		const update = () => {
			UpdateVariables(this)
			this.updateFeedbacks()
		}

		// Run update immediately
		update()

		// Set up periodic updates
		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
		}

		this.updateIntervalId = setInterval(update, this.config.updateInterval)
	}

	private handleCueStateUpdate(data: any): void {
		const { uuid, state } = data

		if (state === 'playing') {
			this.playingCues.add(uuid)
		} else {
			this.playingCues.delete(uuid)
		}

		if (this.config.debugLogging) {
			this.log('debug', `Cue ${uuid} state: ${state}`)
		}
	}

	private handlePlaybackSnapshot(data: any): void {
		this.currentPlayerState = {
			...this.currentPlayerState,
			state: this.getPlayerStateFromSnapshot(data),
			currentCue: data.cues?.[0]?.uuid || null,
		}

		if (this.config.debugLogging) {
			this.log('debug', `Playback snapshot: ${JSON.stringify(this.currentPlayerState)}`)
		}
	}

	private handleMeterUpdate(_data: any): void {
		// Handle meter data for future feedback implementations
		if (this.config.debugLogging) {
			this.log('debug', `Meter update received`)
		}
	}

	private handleDocPatch(data: any): void {
		// Handle document patches for project synchronization
		if (this.config.debugLogging) {
			this.log('debug', `Document patch received: ${JSON.stringify(data)}`)
		}
	}

	private getPlayerStateFromSnapshot(snapshot: any): string {
		if (!snapshot.cues || snapshot.cues.length === 0) {
			return 'stopped'
		}

		const playingCues = snapshot.cues.filter((cue: any) => cue.state === 'playing')
		if (playingCues.length > 0) {
			return 'playing'
		}

		const pausedCues = snapshot.cues.filter((cue: any) => cue.state === 'paused')
		if (pausedCues.length > 0) {
			return 'paused'
		}

		return 'stopped'
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')

		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
			this.updateIntervalId = null
		}

		if (this.apiClient) {
			this.apiClient.destroy()
			this.apiClient = null
		}

		if (this.webSocketClient) {
			this.webSocketClient.destroy()
			this.webSocketClient = null
		}

		this.playingCues.clear()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config

		// Reinitialize clients with new config
		if (this.apiClient) {
			this.apiClient.destroy()
		}
		this.apiClient = new LivePlayApiClient(config)

		if (this.webSocketClient) {
			this.webSocketClient.destroy()
		}
		this.webSocketClient = new LivePlayWebSocket(config)
		this.setupWebSocketHandlers()

		// Restart update loop with new interval
		this.startUpdateLoop()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}
