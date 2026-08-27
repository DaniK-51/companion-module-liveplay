import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, UpdateVariables, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { LivePlayApiClient } from './liveplay-client.js'
import { LivePlayWebSocket, TransportState } from './websocket-client.js'
import type {
	ProjectItem,
	EngineCue,
	MixerInfo,
	DeviceInfo,
	MeterChannel,
	CueStateMessage,
	PlaybackSnapshotMessage,
	MeterMessage,
	DocPatchMessage,
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
	connectionStatus: InstanceStatus = InstanceStatus.UnknownWarning
	connectionMonitorIntervalId: ReturnType<typeof setInterval> | null = null
	updateIntervalId: ReturnType<typeof setInterval> | null = null

	// === Project Document State ===
	projectName = ''
	projectItems = new Map<string, ProjectItem>() // uuid → item (flat, O(1) lookup)
	projectTree: ProjectItem[] = [] // tree for index-based navigation
	cartSlots = new Map<number, string>() // slot → itemUuid

	// === Engine Cues ===
	engineCues = new Map<string, EngineCue>() // cue_id → cue

	// === Cross-reference maps ===
	uuidToCueId = new Map<string, string>() // item_uuid → cue_id
	cueIdToUuid = new Map<string, string>() // cue_id → item_uuid

	// === Real-time Transport State ===
	cueStates = new Map<string, TransportState>() // cue_id → transport
	cuePositions = new Map<string, number>() // cue_id → playhead_seconds
	nextItemUuid: string | null = null

	// === Real-time Meters ===
	cueMeters = new Map<string, MeterChannel[]>() // cue_id → source channels
	mixerMeters = new Map<string, { peakDb: number; rmsDb: number }>() // mixer_id → levels
	masterMeters = new Map<number, { peakDb: number; rmsDb: number; gainReductionDb: number }>() // index → levels

	// === Mixers & Devices ===
	mixers = new Map<string, MixerInfo>() // mixer_id → info
	devices = new Map<string, DeviceInfo>() // device_id → info

	// === Master ===
	masterGainDb = 0

	// === Aggregated player state ===
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
		this.webSocketClient.connect()

		void this.startConnectionMonitoring()

		// Load project state after a short delay to allow WS connection
		setTimeout(() => {
			void this.loadProjectState()
		}, 1000)

		this.startUpdateLoop()

		this.updateStatus(InstanceStatus.Ok)
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
	}

	// === Project State Loading ===

	private async loadProjectState(): Promise<void> {
		if (!this.apiClient) return

		this.log('info', 'Loading project state from LivePlay server...')

		try {
			// Load project document
			const project = await this.apiClient.getProject()
			if (project) {
				this.projectName = project.name
				this.projectTree = project.items
				this.projectItems.clear()

				// Flatten tree into Map
				this.flattenItems(project.items)

				// Load cart slots
				this.cartSlots.clear()
				for (const cart of project.cartItems) {
					this.cartSlots.set(cart.slot, cart.itemUuid)
				}

				this.log('info', `Loaded project "${project.name}" with ${this.projectItems.size} items`)
			}

			// Load engine cues
			const cues = await this.apiClient.getCues()
			this.engineCues.clear()
			for (const cue of cues) {
				this.engineCues.set(cue.id, {
					id: cue.id,
					displayName: cue.display_name,
					filePath: cue.file_path,
					artist: cue.artist,
					title: cue.title,
					durationSec: cue.duration_sec,
					gainDb: cue.gain_db,
					fadeInMs: cue.fade_in_ms,
					fadeOutMs: cue.fade_out_ms,
					sourceChannels: cue.source_channels,
					fileLoaded: cue.file_loaded,
				})
			}

			// Build cross-reference maps
			this.buildCrossReferences()

			// Load mixers
			const mixers = await this.apiClient.getMixers()
			this.mixers.clear()
			for (const mixer of mixers) {
				this.mixers.set(mixer.id, {
					id: mixer.id,
					displayName: mixer.display_name,
					gainDb: mixer.gain_db,
					muted: mixer.muted,
					soloed: mixer.soloed,
				})
			}

			// Load devices
			const devices = await this.apiClient.getDevices()
			this.devices.clear()
			for (const device of devices) {
				this.devices.set(device.id, {
					id: device.id,
					displayName: device.display_name,
					channelCount: device.channel_count,
					sampleRate: device.sample_rate,
					isDefault: device.is_default,
				})
			}

			// Load master gain
			this.masterGainDb = await this.apiClient.getMasterGain()

			this.log(
				'info',
				`Project state loaded: ${this.projectItems.size} items, ${this.engineCues.size} cues, ${this.mixers.size} mixers, ${this.devices.size} devices`,
			)
		} catch (error) {
			this.log('error', `Failed to load project state: ${error}`)
		}
	}

	private flattenItems(items: ProjectItem[], parentIndex: number[] = []): void {
		items.forEach((item, i) => {
			const index = [...parentIndex, i]
			item.index = index
			this.projectItems.set(item.uuid, item)

			if (item.children && item.type === 'group') {
				this.flattenItems(item.children, index)
			}
		})
	}

	private buildCrossReferences(): void {
		this.uuidToCueId.clear()
		this.cueIdToUuid.clear()

		// Match engine cues to project items by file path
		for (const [cueId, cue] of this.engineCues) {
			for (const [uuid, item] of this.projectItems) {
				if (item.type === 'audio' && item.mediaFileName) {
					// Match by filename (cue.filePath is absolute, item.mediaFileName is just the name)
					if (cue.filePath.endsWith(item.mediaFileName) || cue.displayName === item.displayName) {
						this.uuidToCueId.set(uuid, cueId)
						this.cueIdToUuid.set(cueId, uuid)
						item.cueId = cueId
						cue.itemUuid = uuid
						break
					}
				}
			}
		}

		this.log('debug', `Built ${this.uuidToCueId.size} uuid↔cueId cross-references`)
	}

	// === WebSocket Handlers ===

	private setupWebSocketHandlers(): void {
		if (!this.webSocketClient) return

		this.webSocketClient.onConnectionChange((connected) => {
			if (connected) {
				this.updateStatus(InstanceStatus.Ok)
				this.log('info', 'Connected to LivePlay server')
				// Reload project state on reconnect
				void this.loadProjectState()
			} else {
				this.updateStatus(InstanceStatus.UnknownWarning)
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
			this.handleDocPatch(message as DocPatchMessage)
		})
	}

	private handleCueState(msg: CueStateMessage): void {
		this.cueStates.set(msg.cue_id, msg.transport)
		this.cuePositions.set(msg.cue_id, msg.playhead_seconds)

		if (msg.item_uuid) {
			this.uuidToCueId.set(msg.item_uuid, msg.cue_id)
			this.cueIdToUuid.set(msg.cue_id, msg.item_uuid)
		}

		this.recalculateState()

		if (this.config.debugLogging) {
			this.log('debug', `cue_state: ${msg.cue_id} transport=${msg.transport} pos=${msg.playhead_seconds.toFixed(2)}s`)
		}
	}

	private handlePlaybackSnapshot(msg: PlaybackSnapshotMessage): void {
		this.cueStates.clear()
		this.cuePositions.clear()
		// Don't clear uuidToCueId/cueIdToUuid - preserve project-level mappings

		for (const cue of msg.cues) {
			this.cueStates.set(cue.cue_id, cue.transport)
			this.cuePositions.set(cue.cue_id, cue.playhead_seconds)
			if (cue.item_uuid) {
				this.uuidToCueId.set(cue.item_uuid, cue.cue_id)
				this.cueIdToUuid.set(cue.cue_id, cue.item_uuid)
			}
		}

		this.nextItemUuid = msg.next_item_uuid || null
		this.masterGainDb = msg.master_gain_db

		this.recalculateState()

		if (this.config.debugLogging) {
			this.log('debug', `playback_snapshot: ${msg.cues.length} cues, master=${msg.master_gain_db}dB`)
		}
	}

	private handleMeterUpdate(msg: MeterMessage): void {
		// Update master meters
		for (const master of msg.master_channels) {
			this.masterMeters.set(master.index, {
				peakDb: master.peak_db,
				rmsDb: master.rms_db,
				gainReductionDb: master.gain_reduction_db,
			})
		}

		// Update mixer meters
		for (const mixer of msg.mixer_channels) {
			this.mixerMeters.set(mixer.mixer_id, {
				peakDb: mixer.peak_db,
				rmsDb: mixer.rms_db,
			})
		}

		// Update cue meters
		this.cueMeters.clear()
		for (const item of msg.items) {
			this.cueMeters.set(item.cue_id, item.sources)
		}

		if (this.config.debugLogging) {
			const masterPeak = this.masterMeters.get(0)?.peakDb ?? -Infinity
			this.log('debug', `meters: master=${masterPeak.toFixed(1)}dB cues=${msg.items.length}`)
		}
	}

	// === doc_patch Handler ===

	private handleDocPatch(msg: DocPatchMessage): void {
		const op = msg.op

		if (this.config.debugLogging) {
			this.log('debug', `doc_patch: ${op}`)
		}

		switch (op) {
			case 'project_changed':
				// Full project reload needed
				this.log('info', 'Project changed, reloading...')
				void this.loadProjectState()
				break

			case 'item_added':
				this.handleItemAdded(msg)
				break

			case 'item_updated':
				this.handleItemUpdated(msg)
				break

			case 'item_removed':
				this.handleItemRemoved(msg)
				break

			case 'items_reordered':
				this.handleItemsReordered(msg)
				break

			case 'cart_slot_set':
				this.handleCartSlotSet(msg)
				break

			case 'cart_slot_cleared':
				this.handleCartSlotCleared(msg)
				break

			case 'master_gain_changed':
				if (typeof msg.db === 'number') {
					this.masterGainDb = msg.db
				}
				break

			case 'next_item_set':
				this.nextItemUuid = (msg.itemUuid as string) || null
				break

			case 'preview_started':
			case 'preview_stopped':
				// Could track preview state if needed
				break

			case 'theme_patched':
			case 'settings_patched':
				// Could update project settings if needed
				break

			case 'waveform_ready':
			case 'waveform_failed':
				// Waveform updates - not critical for Companion
				break

			default:
				if (this.config.debugLogging) {
					this.log('debug', `Unhandled doc_patch op: ${op}`)
				}
		}
	}

	private handleItemAdded(msg: DocPatchMessage): void {
		const uuid = msg.uuid as string
		const parentUuid = msg.parentUuid as string
		const item = msg.item as ProjectItem
		const cueId = msg.cueId as string | undefined

		if (!uuid || !item) return

		// Set index (will be recalculated on reorder)
		item.index = []
		item.cueId = cueId

		// Add to flat map
		this.projectItems.set(uuid, item)

		// Add to tree
		if (!parentUuid) {
			// Add to root
			this.projectTree.push(item)
		} else {
			// Find parent group and add as child
			const parent = this.projectItems.get(parentUuid)
			if (parent && parent.type === 'group') {
				if (!parent.children) parent.children = []
				parent.children.push(item)
			}
		}

		// Update cross-references if cueId provided
		if (cueId) {
			this.uuidToCueId.set(uuid, cueId)
			this.cueIdToUuid.set(cueId, uuid)
		}

		this.log('info', `Item added: ${item.displayName} (${uuid})`)
	}

	private handleItemUpdated(msg: DocPatchMessage): void {
		const uuid = msg.uuid as string
		const patch = msg.patch as Partial<ProjectItem>

		if (!uuid || !patch) return

		const existing = this.projectItems.get(uuid)
		if (!existing) {
			this.log('warn', `item_updated for unknown uuid: ${uuid}`)
			return
		}

		// Merge patch into existing item
		Object.assign(existing, patch)

		this.log('debug', `Item updated: ${uuid}`)
	}

	private handleItemRemoved(msg: DocPatchMessage): void {
		const uuid = msg.uuid as string
		if (!uuid) return

		const item = this.projectItems.get(uuid)
		if (!item) return

		// Remove from flat map
		this.projectItems.delete(uuid)

		// Remove from tree
		this.removeFromTree(this.projectTree, uuid)

		// Clean up cross-references
		const cueId = this.uuidToCueId.get(uuid)
		if (cueId) {
			this.uuidToCueId.delete(uuid)
			this.cueIdToUuid.delete(cueId)
		}

		this.log('info', `Item removed: ${item.displayName} (${uuid})`)
	}

	private removeFromTree(tree: ProjectItem[], uuid: string): boolean {
		for (let i = 0; i < tree.length; i++) {
			if (tree[i].uuid === uuid) {
				tree.splice(i, 1)
				return true
			}
			if (tree[i].children && this.removeFromTree(tree[i].children!, uuid)) {
				return true
			}
		}
		return false
	}

	private handleItemsReordered(msg: DocPatchMessage): void {
		const parentUuid = msg.parentUuid as string
		const uuids = msg.uuids as string[]

		if (!uuids) return

		const targetArray = parentUuid ? this.projectItems.get(parentUuid)?.children : this.projectTree

		if (!targetArray) {
			this.log('warn', `items_reordered: parent not found: ${parentUuid}`)
			return
		}

		// Reorder children according to new uuids array
		const reordered: ProjectItem[] = []
		for (const uuid of uuids) {
			const item = this.projectItems.get(uuid)
			if (item) {
				reordered.push(item)
			}
		}

		// Replace children
		targetArray.length = 0
		targetArray.push(...reordered)

		// Recalculate indices
		this.recalculateIndices()

		this.log('debug', `Items reordered under ${parentUuid || 'root'}: ${uuids.length} items`)
	}

	private recalculateIndices(tree: ProjectItem[] = this.projectTree, parentIndex: number[] = []): void {
		tree.forEach((item, i) => {
			const index = [...parentIndex, i]
			item.index = index

			if (item.children && item.type === 'group') {
				this.recalculateIndices(item.children, index)
			}
		})
	}

	/**
	 * Find a project item by its index path.
	 * Accepts comma or slash separated zero-based indices.
	 * Examples: "5" = 6th top-level item, "1,11" = top-level[1].children[11]
	 */
	findItemByIndex(indexPath: string): ProjectItem | null {
		const parts = indexPath
			.replace(/\//g, ',')
			.split(',')
			.map((s) => parseInt(s.trim(), 10))

		if (parts.some((n) => isNaN(n) || n < 0)) {
			return null
		}

		let current = this.projectTree
		let item: ProjectItem | null = null

		for (const idx of parts) {
			if (idx >= current.length) {
				return null
			}
			item = current[idx]
			if (item.children && item.type === 'group') {
				current = item.children
			} else {
				current = []
			}
		}

		return item
	}

	private handleCartSlotSet(msg: DocPatchMessage): void {
		const slot = msg.slot as number
		const itemUuid = msg.itemUuid as string

		if (typeof slot === 'number' && itemUuid) {
			this.cartSlots.set(slot, itemUuid)
			this.log('debug', `Cart slot ${slot} set to ${itemUuid}`)
		}
	}

	private handleCartSlotCleared(msg: DocPatchMessage): void {
		const slot = msg.slot as number

		if (typeof slot === 'number') {
			this.cartSlots.delete(slot)
			this.log('debug', `Cart slot ${slot} cleared`)
		}
	}

	// === State Aggregation ===

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
			masterGain: this.masterGainDb,
			activeCueCount: activeCount,
			currentCueId: latestPlayingCueId,
		}
	}

	// === Connection Monitoring ===

	private async startConnectionMonitoring(): Promise<void> {
		const checkConnection = async () => {
			try {
				if (this.apiClient) {
					const isHealthy = await this.apiClient.checkHealth()
					if (isHealthy) {
						if (this.connectionStatus !== InstanceStatus.Ok) {
							this.updateStatus(InstanceStatus.Ok)
						}
						if (!this.webSocketClient?.isConnectedToServer()) {
							this.webSocketClient?.connect()
						}
					} else {
						if (this.connectionStatus !== InstanceStatus.UnknownWarning) {
							this.updateStatus(InstanceStatus.UnknownWarning)
						}
					}
				}
			} catch (_error) {
				if (this.connectionStatus !== InstanceStatus.UnknownWarning) {
					this.updateStatus(InstanceStatus.UnknownWarning)
				}
			}
		}

		await checkConnection()

		if (this.connectionMonitorIntervalId) {
			clearInterval(this.connectionMonitorIntervalId)
		}

		this.connectionMonitorIntervalId = setInterval(() => {
			void checkConnection()
		}, 30000)
	}

	// === Update Loop ===

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

	// === Lifecycle ===

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

		// Clear all state
		this.projectItems.clear()
		this.projectTree = []
		this.cartSlots.clear()
		this.engineCues.clear()
		this.uuidToCueId.clear()
		this.cueIdToUuid.clear()
		this.cueStates.clear()
		this.cuePositions.clear()
		this.cueMeters.clear()
		this.mixerMeters.clear()
		this.masterMeters.clear()
		this.mixers.clear()
		this.devices.clear()
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
