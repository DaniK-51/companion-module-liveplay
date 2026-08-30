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

const ALL_FEEDBACK_IDS = [
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
	'next_mode_active',
	'next_mode_assigned',
	'cue_is_next',
] as const

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	apiClient: LivePlayApiClient | null = null
	webSocketClient: LivePlayWebSocket | null = null
	state!: ModuleState
	connectionStatus: InstanceStatus = InstanceStatus.UnknownWarning
	noPlayMode = false
	previewMode = false
	nextMode = false
	private connectionMonitorIntervalId: ReturnType<typeof setInterval> | null = null
	private updateIntervalId: ReturnType<typeof setInterval> | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.state = new ModuleState((level, message) => this.log(level, message))
		this.state.setDebugLogging(config.debugLogging)
		this.apiClient = new LivePlayApiClient(config)

		this.setupWebSocket()
		this.registerDefinitions()
		this.startUpdateLoop()
		this.startConnectionMonitoring()
	}

	private setupWebSocket(): void {
		this.webSocketClient = new LivePlayWebSocket(this.config)
		this.webSocketClient.setLogger((level, message) => this.log(level, message))

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

		this.webSocketClient.onMessage('cue_state', (msg) => this.state.handleCueState(msg as CueStateMessage))
		this.webSocketClient.onMessage('playback_snapshot', (msg) =>
			this.state.handlePlaybackSnapshot(msg as PlaybackSnapshotMessage),
		)
		this.webSocketClient.onMessage('meters', (msg) => this.state.handleMeterUpdate(msg as MeterMessage))
		this.webSocketClient.onMessage('set_selection', (msg) => this.state.handleSetSelection(msg as SelectionMessage))
		this.webSocketClient.onMessage('doc_patch', (msg) => {
			if (this.state.handleDocPatch(msg as DocPatchMessage).reloadProject) {
				void this.loadProjectState()
			}
		})

		this.updateStatus(InstanceStatus.Connecting)
		this.webSocketClient.connect()
	}

	private registerDefinitions(): void {
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
	}

	private async loadProjectState(): Promise<void> {
		if (!this.apiClient) return
		this.log('info', 'Loading project state from LivePlay server...')

		try {
			const [project, cues, mixers, devices, masterGain] = await Promise.all([
				this.apiClient.getProject(),
				this.apiClient.getCues(),
				this.apiClient.getMixers(),
				this.apiClient.getDevices(),
				this.apiClient.getMasterGain(),
			])

			if (project) this.state.loadProject(project)
			this.state.loadEngineCues(cues)
			this.state.buildCrossReferences()
			this.state.loadMixers(mixers)
			this.state.loadDevices(devices)
			this.state.masterGainDb = masterGain

			this.log(
				'info',
				`Project state loaded: ${this.state.projectItems.size} items, ${this.state.engineCues.size} cues, ${this.state.mixers.size} mixers, ${this.state.devices.size} devices`,
			)
		} catch (error) {
			this.log('error', `Failed to load project state: ${error}`)
		}
	}

	private startConnectionMonitoring(): void {
		const checkConnection = async () => {
			try {
				if (!this.apiClient) return
				if (await this.apiClient.checkHealth()) {
					this.updateStatus(InstanceStatus.Ok)
					if (!this.webSocketClient?.isConnectedToServer()) {
						this.webSocketClient?.connect()
					}
				} else {
					this.updateStatus(InstanceStatus.UnknownWarning)
				}
			} catch {
				this.updateStatus(InstanceStatus.UnknownWarning)
			}
		}

		void checkConnection()
		if (this.connectionMonitorIntervalId) clearInterval(this.connectionMonitorIntervalId)
		this.connectionMonitorIntervalId = setInterval(() => void checkConnection(), 30000)
	}

	private startUpdateLoop(): void {
		const update = () => {
			UpdateVariables(this)
			this.checkFeedbacks(...ALL_FEEDBACK_IDS)
		}

		update()
		if (this.updateIntervalId) clearInterval(this.updateIntervalId)
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
		this.webSocketClient?.destroy()
		this.setupWebSocket()
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
