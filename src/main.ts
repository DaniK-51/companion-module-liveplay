import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, UpdateVariables, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { LivePlayApiClient } from './liveplay-client.js'
import { LivePlayWebSocket } from './websocket-client.js'
import { ModuleState } from './state.js'
import type {
	CueStateMessage,
	PlaybackSnapshotMessage,
	MeterMessage,
	DocPatchMessage,
	SelectionMessage,
} from './types.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	apiClient: LivePlayApiClient | null = null
	webSocketClient: LivePlayWebSocket | null = null
	state!: ModuleState
	connectionStatus: InstanceStatus = InstanceStatus.UnknownWarning
	noPlayMode = false // When true, buttons only assign/unassign, no playback
	previewMode = false // When true, assigned buttons play in preview instead of main
	connectionMonitorIntervalId: ReturnType<typeof setInterval> | null = null
	updateIntervalId: ReturnType<typeof setInterval> | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.state = new ModuleState((level, message) => this.log(level, message))
		this.state.setDebugLogging(config.debugLogging)

		this.apiClient = new LivePlayApiClient(config)

		this.webSocketClient = new LivePlayWebSocket(config)
		this.webSocketClient.setLogger((level, message) => this.log(level, message))
		this.setupWebSocketHandlers()

		this.updateStatus(InstanceStatus.Connecting)
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()

		this.startUpdateLoop()

		void this.connectWithHealthCheck()
		void this.startConnectionMonitoring()
	}

	private async connectWithHealthCheck(): Promise<void> {
		if (!this.apiClient) return

		this.log('info', 'Checking server health...')
		const isHealthy = await this.apiClient.checkHealth()

		if (isHealthy) {
			this.log('info', 'Server is healthy, connecting WebSocket...')
			this.webSocketClient?.connect()
			setTimeout(() => {
				void this.loadProjectState()
			}, 500)
		} else {
			this.log('warn', 'Server not healthy, will retry via connection monitor')
			this.updateStatus(InstanceStatus.ConnectionFailure)
		}
	}

	private async loadProjectState(): Promise<void> {
		if (!this.apiClient) return

		this.log('info', 'Loading project state from LivePlay server...')

		try {
			const project = await this.apiClient.getProject()
			if (project) {
				this.state.loadProject(project)
			}

			const cues = await this.apiClient.getCues()
			this.state.loadEngineCues(cues)

			this.state.buildCrossReferences()

			const mixers = await this.apiClient.getMixers()
			this.state.loadMixers(mixers)

			const devices = await this.apiClient.getDevices()
			this.state.loadDevices(devices)

			this.state.masterGainDb = await this.apiClient.getMasterGain()

			this.log(
				'info',
				`Project state loaded: ${this.state.projectItems.size} items, ${this.state.engineCues.size} cues, ${this.state.mixers.size} mixers, ${this.state.devices.size} devices`,
			)
		} catch (error) {
			this.log('error', `Failed to load project state: ${error}`)
		}
	}

	private setupWebSocketHandlers(): void {
		if (!this.webSocketClient) return

		this.webSocketClient.onConnectionChange((connected) => {
			if (connected) {
				this.updateStatus(InstanceStatus.Ok)
				this.log('info', 'Connected to LivePlay server')
				void this.loadProjectState()
			} else {
				this.updateStatus(InstanceStatus.UnknownWarning)
				this.log('warn', 'Disconnected from LivePlay server')
			}
		})

		this.webSocketClient.onMessage('cue_state', (message) => {
			this.state.handleCueState(message as CueStateMessage)
		})

		this.webSocketClient.onMessage('playback_snapshot', (message) => {
			this.state.handlePlaybackSnapshot(message as PlaybackSnapshotMessage)
		})

		this.webSocketClient.onMessage('meters', (message) => {
			this.state.handleMeterUpdate(message as MeterMessage)
		})

		this.webSocketClient.onMessage('doc_patch', (message) => {
			const result = this.state.handleDocPatch(message as DocPatchMessage)
			if (result.reloadProject) {
				void this.loadProjectState()
			}
		})

		this.webSocketClient.onMessage('set_selection', (message) => {
			this.state.handleSetSelection(message as SelectionMessage)
		})
	}

	private startConnectionMonitoring(): void {
		const checkConnection = async () => {
			try {
				if (this.apiClient) {
					const isHealthy = await this.apiClient.checkHealth()
					if (isHealthy) {
						this.updateStatus(InstanceStatus.Ok)
						if (!this.webSocketClient?.isConnectedToServer()) {
							this.webSocketClient?.connect()
						}
					} else {
						this.updateStatus(InstanceStatus.UnknownWarning)
					}
				}
			} catch {
				this.updateStatus(InstanceStatus.UnknownWarning)
			}
		}

		void checkConnection()

		if (this.connectionMonitorIntervalId) {
			clearInterval(this.connectionMonitorIntervalId)
		}

		this.connectionMonitorIntervalId = setInterval(() => {
			void checkConnection()
		}, 30000)
	}

	private startUpdateLoop(): void {
		const update = () => {
			UpdateVariables(this)
			this.checkFeedbacks(
				'connection_status',
				'any_cue_playing',
				'any_cue_paused',
				'cue_is_playing',
				'cue_is_paused',
				'cue_is_stopped',
				'cue_ready_to_assign',
				'no_play_active',
				'no_play_assigned',
				'preview_mode_active',
				'preview_mode_assigned',
			)
		}

		update()

		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
		}

		this.updateIntervalId = setInterval(update, this.config.updateInterval)
	}

	async destroy(): Promise<void> {
		this.log('debug', 'destroy')

		if (this.connectionMonitorIntervalId) {
			clearInterval(this.connectionMonitorIntervalId)
			this.connectionMonitorIntervalId = null
		}

		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
			this.updateIntervalId = null
		}

		if (this.webSocketClient) {
			this.webSocketClient.destroy()
			this.webSocketClient = null
		}

		this.state?.clear()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.state?.setDebugLogging(config.debugLogging)

		if (this.webSocketClient) {
			this.webSocketClient.destroy()
		}
		this.webSocketClient = new LivePlayWebSocket(config)
		this.webSocketClient.setLogger((level, message) => this.log(level, message))
		this.setupWebSocketHandlers()

		this.webSocketClient.connect()
		this.startUpdateLoop()
	}

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
