import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, UpdateVariables, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { LivePlayApiClient } from './liveplay-client.js'
import {
	LivePlayWebSocket,
	TransportState,
	type ServerMessage,
	type CueStateMessage,
	type PlaybackSnapshotMessage,
	type MeterMessage,
} from './websocket-client.js'

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
	connectionStatus: InstanceStatus = InstanceStatus.Ok
	updateIntervalId: ReturnType<typeof setInterval> | null = null

	// State from WebSocket
	cueStates = new Map<string, TransportState>() // cue_id → transport
	cuePositions = new Map<string, number>() // cue_id → playhead_seconds
	uuidToCueId = new Map<string, string>() // item_uuid → cue_id
	nextItemUuid: string | null = null

	currentPlayerState = {
		state: 'stopped',
		position: 0,
		progress: 0,
		masterGain: 0,
		activeCueCount: 0,
		currentCueId: '',
	}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.apiClient = new LivePlayApiClient(config)

		this.webSocketClient = new LivePlayWebSocket(config)
		this.webSocketClient.setLogger((level, message) => this.log(level, message))
		this.setupWebSocketHandlers()

		void this.startConnectionMonitoring()

		this.startUpdateLoop()

		this.updateStatus(InstanceStatus.Ok)
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
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

		this.webSocketClient.onMessage('cue_state', (message) => {
			this.handleCueState(message as CueStateMessage)
		})

		this.webSocketClient.onMessage('playback_snapshot', (message) => {
			this.handlePlaybackSnapshot(message as PlaybackSnapshotMessage)
		})

		this.webSocketClient.onMessage('meters', (message) => {
			this.handleMeterUpdate(message as MeterMessage)
		})

		this.webSocketClient.onMessage('doc_patch', (message) => {
			if (this.config.debugLogging) {
				this.log('debug', `doc_patch: ${(message as ServerMessage & { op?: string }).op}`)
			}
		})
	}

	private handleCueState(msg: CueStateMessage): void {
		this.cueStates.set(msg.cue_id, msg.transport)
		this.cuePositions.set(msg.cue_id, msg.playhead_seconds)

		if (msg.item_uuid) {
			this.uuidToCueId.set(msg.item_uuid, msg.cue_id)
		}

		this.recalculateState()

		if (this.config.debugLogging) {
			this.log('debug', `cue_state: ${msg.cue_id} transport=${msg.transport} pos=${msg.playhead_seconds.toFixed(2)}s`)
		}
	}

	private handlePlaybackSnapshot(msg: PlaybackSnapshotMessage): void {
		this.cueStates.clear()
		this.cuePositions.clear()
		this.uuidToCueId.clear()

		for (const cue of msg.cues) {
			this.cueStates.set(cue.cue_id, cue.transport)
			this.cuePositions.set(cue.cue_id, cue.playhead_seconds)
			if (cue.item_uuid) {
				this.uuidToCueId.set(cue.item_uuid, cue.cue_id)
			}
		}

		this.nextItemUuid = msg.next_item_uuid || null
		this.currentPlayerState.masterGain = msg.master_gain_db

		this.recalculateState()

		if (this.config.debugLogging) {
			this.log('debug', `playback_snapshot: ${msg.cues.length} cues, master=${msg.master_gain_db}dB`)
		}
	}

	private handleMeterUpdate(_msg: MeterMessage): void {
		if (this.config.debugLogging) {
			this.log('debug', `meters update`)
		}
	}

	private recalculateState(): void {
		let anyPlaying = false
		let anyPaused = false
		let activeCount = 0
		let latestPlayingCueId = ''
		let latestPosition = 0

		for (const [cueId, transport] of this.cueStates) {
			if (transport === TransportState.Playing || transport === TransportState.FadingOut) {
				anyPlaying = true
				activeCount++
				const pos = this.cuePositions.get(cueId) ?? 0
				if (pos >= latestPosition) {
					latestPosition = pos
					latestPlayingCueId = cueId
				}
			} else if (transport === TransportState.Paused) {
				anyPaused = true
				activeCount++
			}
		}

		let stateStr = 'stopped'
		if (anyPlaying) stateStr = 'playing'
		else if (anyPaused) stateStr = 'paused'

		this.currentPlayerState = {
			state: stateStr,
			position: latestPosition,
			progress: 0,
			masterGain: this.currentPlayerState.masterGain,
			activeCueCount: activeCount,
			currentCueId: latestPlayingCueId,
		}
	}

	private async startConnectionMonitoring(): Promise<void> {
		const checkConnection = async () => {
			try {
				if (this.apiClient && this.connectionStatus !== InstanceStatus.Ok) {
					const isHealthy = await this.apiClient.checkHealth()
					if (isHealthy) {
						this.updateStatus(InstanceStatus.Ok)
						this.webSocketClient?.connect()
					} else {
						this.updateStatus(InstanceStatus.Connecting)
					}
				}
			} catch (_error) {
				if (this.connectionStatus !== InstanceStatus.Connecting) {
					this.updateStatus(InstanceStatus.Connecting)
				}
			}
		}

		await checkConnection()

		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
		}

		this.updateIntervalId = setInterval(() => {
			void checkConnection()
		}, 30000)
	}

	private startUpdateLoop(): void {
		const update = () => {
			UpdateVariables(this)
			this.updateFeedbacks()
		}

		update()

		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
		}

		this.updateIntervalId = setInterval(update, this.config.updateInterval)
	}

	async destroy(): Promise<void> {
		this.log('debug', 'destroy')

		if (this.updateIntervalId) {
			clearInterval(this.updateIntervalId)
			this.updateIntervalId = null
		}

		if (this.webSocketClient) {
			this.webSocketClient.destroy()
			this.webSocketClient = null
		}

		this.cueStates.clear()
		this.cuePositions.clear()
		this.uuidToCueId.clear()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config

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
