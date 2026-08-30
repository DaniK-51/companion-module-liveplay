import { TransportState } from './websocket-client.js'
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
	SelectionMessage,
} from './types.js'

export type Logger = (level: 'info' | 'warn' | 'error' | 'debug', message: string) => void

export interface PlayerState {
	state: string
	position: number
	progress: number
	masterGain: number
	activeCueCount: number
	currentCueId: string
}

export class ModuleState {
	private log: Logger
	private debugLogging = false

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
	autoNextItemUuid: string | null = null
	selectedItemUuid: string | null = null // last cue selected in LivePlay UI

	// === Real-time Meters ===
	cueMeters = new Map<string, MeterChannel[]>() // cue_id → source channels
	mixerMeters = new Map<string, { peakDb: number; rmsDb: number }>() // mixer_id → levels
	masterMeters = new Map<number, { peakDb: number; rmsDb: number; gainReductionDb: number }>() // index → levels

	// === Mixers & Devices ===
	mixers = new Map<string, MixerInfo>() // mixer_id → info
	devices = new Map<string, DeviceInfo>() // device_id → info

	// === Master ===
	masterGainDb = 0

	// === Preview State ===
	previewItemUuid: string | null = null
	previewCueId: string | null = null

	// === Aggregated player state ===
	currentPlayerState: PlayerState = {
		state: 'stopped',
		position: 0,
		progress: 0,
		masterGain: 0,
		activeCueCount: 0,
		currentCueId: '',
	}

	constructor(log: Logger) {
		this.log = log
	}

	setDebugLogging(enabled: boolean): void {
		this.debugLogging = enabled
	}

	// === Project State Loading ===

	loadProject(project: {
		name: string
		items: ProjectItem[]
		cartItems: Array<{ slot: number; itemUuid: string }>
	}): void {
		this.projectName = project.name
		this.projectTree = project.items
		this.projectItems.clear()
		this.flattenItems(project.items)

		this.cartSlots.clear()
		for (const cart of project.cartItems) {
			this.cartSlots.set(cart.slot, cart.itemUuid)
		}

		this.log('info', `Loaded project "${project.name}" with ${this.projectItems.size} items`)
	}

	loadEngineCues(
		cues: Array<{
			id: string
			display_name: string
			file_path: string
			artist: string
			title: string
			duration_sec: number
			gain_db: number
			fade_in_ms: number
			fade_out_ms: number
			source_channels: number
			file_loaded: boolean
		}>,
	): void {
		this.engineCues.clear()
		for (const c of cues) {
			this.engineCues.set(c.id, {
				id: c.id,
				displayName: c.display_name,
				filePath: c.file_path,
				artist: c.artist,
				title: c.title,
				durationSec: c.duration_sec,
				gainDb: c.gain_db,
				fadeInMs: c.fade_in_ms,
				fadeOutMs: c.fade_out_ms,
				sourceChannels: c.source_channels,
				fileLoaded: c.file_loaded,
			})
		}
	}

	loadMixers(
		mixers: Array<{ id: string; display_name: string; gain_db: number; muted: boolean; soloed: boolean }>,
	): void {
		this.mixers.clear()
		for (const m of mixers) {
			this.mixers.set(m.id, {
				id: m.id,
				displayName: m.display_name,
				gainDb: m.gain_db,
				muted: m.muted,
				soloed: m.soloed,
			})
		}
	}

	loadDevices(
		devices: Array<{
			id: string
			display_name: string
			channel_count: number
			sample_rate: number
			is_default: boolean
		}>,
	): void {
		this.devices.clear()
		for (const d of devices) {
			this.devices.set(d.id, {
				id: d.id,
				displayName: d.display_name,
				channelCount: d.channel_count,
				sampleRate: d.sample_rate,
				isDefault: d.is_default,
			})
		}
	}

	buildCrossReferences(): void {
		this.uuidToCueId.clear()
		this.cueIdToUuid.clear()

		for (const [cueId, cue] of this.engineCues) {
			for (const [uuid, item] of this.projectItems) {
				if (item.type === 'audio' && item.mediaFileName) {
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

	// === WebSocket Message Handlers ===

	handleCueState(msg: CueStateMessage): void {
		this.cueStates.set(msg.cue_id, msg.transport)
		this.cuePositions.set(msg.cue_id, msg.playhead_seconds)

		if (msg.item_uuid) {
			this.uuidToCueId.set(msg.item_uuid, msg.cue_id)
			this.cueIdToUuid.set(msg.cue_id, msg.item_uuid)
		}

		this.recalculateState()

		if (this.debugLogging) {
			this.log('debug', `cue_state: ${msg.cue_id} transport=${msg.transport} pos=${msg.playhead_seconds.toFixed(2)}s`)
		}
	}

	handlePlaybackSnapshot(msg: PlaybackSnapshotMessage): void {
		this.cueStates.clear()
		this.cuePositions.clear()

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
		this.selectedItemUuid = msg.selected_item_uuid || null

		// Update preview state from snapshot
		if (msg.preview) {
			this.previewItemUuid = msg.preview.item_uuid || null
			this.previewCueId = msg.preview.cue_id || null
		}

		this.recalculateState()

		if (this.debugLogging) {
			this.log('debug', `playback_snapshot: ${msg.cues.length} cues, master=${msg.master_gain_db}dB`)
		}
	}

	handleMeterUpdate(msg: MeterMessage): void {
		for (const master of msg.master_channels) {
			this.masterMeters.set(master.index, {
				peakDb: master.peak_db,
				rmsDb: master.rms_db,
				gainReductionDb: master.gain_reduction_db,
			})
		}

		for (const mixer of msg.mixer_channels) {
			this.mixerMeters.set(mixer.mixer_id, {
				peakDb: mixer.peak_db,
				rmsDb: mixer.rms_db,
			})
		}

		this.cueMeters.clear()
		for (const item of msg.items) {
			this.cueMeters.set(item.cue_id, item.sources)
		}

		if (this.debugLogging) {
			const masterPeak = this.masterMeters.get(0)?.peakDb ?? -Infinity
			this.log('debug', `meters: master=${masterPeak.toFixed(1)}dB cues=${msg.items.length}`)
		}
	}

	handleSetSelection(msg: SelectionMessage): void {
		this.selectedItemUuid = msg.item_uuid || null

		if (this.debugLogging) {
			this.log('debug', `set_selection: ${msg.item_uuid}`)
		}
	}

	// === doc_patch Handlers ===

	handleDocPatch(msg: DocPatchMessage): { reloadProject: boolean } {
		const op = msg.op

		if (this.debugLogging) {
			this.log('debug', `doc_patch: ${op}`)
		}

		switch (op) {
			case 'project_changed':
				this.log('info', 'Project changed, reloading...')
				return { reloadProject: true }

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

			case 'selection_changed':
				this.selectedItemUuid = (msg.itemUuid as string) || null
				if (this.debugLogging) {
					this.log('debug', `selection_changed: ${this.selectedItemUuid}`)
				}
				break

			case 'preview_started':
				this.previewItemUuid = (msg.itemUuid as string) || null
				this.previewCueId = (msg.cueId as string) || null
				if (this.debugLogging) {
					this.log('debug', `preview_started: ${this.previewItemUuid}`)
				}
				break

			case 'preview_stopped':
				this.previewItemUuid = null
				this.previewCueId = null
				if (this.debugLogging) {
					this.log('debug', 'preview_stopped')
				}
				break

			case 'theme_patched':
			case 'settings_patched':
			case 'waveform_ready':
			case 'waveform_failed':
				break

			default:
				if (this.debugLogging) {
					this.log('debug', `Unhandled doc_patch op: ${op}`)
				}
		}

		return { reloadProject: false }
	}

	private handleItemAdded(msg: DocPatchMessage): void {
		const uuid = msg.uuid as string
		const parentUuid = msg.parentUuid as string
		const item = msg.item as ProjectItem
		const cueId = msg.cueId as string | undefined

		if (!uuid || !item) return

		item.index = []
		item.cueId = cueId

		this.projectItems.set(uuid, item)

		if (!parentUuid) {
			this.projectTree.push(item)
		} else {
			const parent = this.projectItems.get(parentUuid)
			if (parent && parent.type === 'group') {
				if (!parent.children) parent.children = []
				parent.children.push(item)
			}
		}

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

		Object.assign(existing, patch)

		if (this.debugLogging) {
			this.log('debug', `Item updated: ${uuid}`)
		}
	}

	private handleItemRemoved(msg: DocPatchMessage): void {
		const uuid = msg.uuid as string
		if (!uuid) return

		const item = this.projectItems.get(uuid)
		if (!item) return

		this.projectItems.delete(uuid)
		this.removeFromTree(this.projectTree, uuid)

		const cueId = this.uuidToCueId.get(uuid)
		if (cueId) {
			this.uuidToCueId.delete(uuid)
			this.cueIdToUuid.delete(cueId)
		}

		this.log('info', `Item removed: ${item.displayName} (${uuid})`)
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

		const reordered: ProjectItem[] = []
		for (const uuid of uuids) {
			const item = this.projectItems.get(uuid)
			if (item) {
				reordered.push(item)
			}
		}

		targetArray.length = 0
		targetArray.push(...reordered)

		this.recalculateIndices()

		if (this.debugLogging) {
			this.log('debug', `Items reordered under ${parentUuid || 'root'}: ${uuids.length} items`)
		}
	}

	private handleCartSlotSet(msg: DocPatchMessage): void {
		const slot = msg.slot as number
		const itemUuid = msg.itemUuid as string

		if (typeof slot === 'number' && itemUuid) {
			this.cartSlots.set(slot, itemUuid)
			if (this.debugLogging) {
				this.log('debug', `Cart slot ${slot} set to ${itemUuid}`)
			}
		}
	}

	private handleCartSlotCleared(msg: DocPatchMessage): void {
		const slot = msg.slot as number

		if (typeof slot === 'number') {
			this.cartSlots.delete(slot)
			if (this.debugLogging) {
				this.log('debug', `Cart slot ${slot} cleared`)
			}
		}
	}

	// === Tree Operations ===

	private walkTree(tree: ProjectItem[], parentIndex: number[], register: boolean): void {
		for (let i = 0; i < tree.length; i++) {
			const index = [...parentIndex, i]
			tree[i].index = index
			if (register) this.projectItems.set(tree[i].uuid, tree[i])
			if (tree[i].children && tree[i].type === 'group') {
				this.walkTree(tree[i].children!, index, register)
			}
		}
	}

	private flattenItems(items: ProjectItem[]): void {
		this.walkTree(items, [], true)
	}

	recalculateIndices(tree: ProjectItem[] = this.projectTree, parentIndex: number[] = []): void {
		this.walkTree(tree, parentIndex, false)
	}

	private removeFromTree(tree: ProjectItem[], uuid: string): boolean {
		for (let i = 0; i < tree.length; i++) {
			if (tree[i].uuid === uuid) {
				tree.splice(i, 1)
				return true
			}
			if (tree[i].children && this.removeFromTree(tree[i].children!, uuid)) return true
		}
		return false
	}

	findNextSibling(uuid: string): ProjectItem | undefined {
		const findInTree = (tree: ProjectItem[]): ProjectItem | undefined => {
			for (let i = 0; i < tree.length; i++) {
				if (tree[i].uuid === uuid) return i + 1 < tree.length ? tree[i + 1] : undefined
				if (tree[i].children && tree[i].type === 'group') {
					const found = findInTree(tree[i].children!)
					if (found) return found
				}
			}
			return undefined
		}
		return this.projectItems.has(uuid) ? findInTree(this.projectTree) : undefined
	}

	findItemByIndex(indexPath: string): ProjectItem | null {
		const parts = indexPath
			.replace(/\//g, ',')
			.split(',')
			.map((s) => parseInt(s.trim(), 10))
		if (parts.some((n) => isNaN(n) || n < 0)) return null

		let current = this.projectTree
		let item: ProjectItem | null = null

		for (const idx of parts) {
			if (idx >= current.length) return null
			item = current[idx]
			current = item.children && item.type === 'group' ? item.children : []
		}
		return item
	}

	// === State Aggregation ===

	recalculateState(): void {
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

		// Compute auto-next from current cue's endBehavior
		const currentUuid = latestPlayingCueId ? (this.cueIdToUuid.get(latestPlayingCueId) ?? '') : ''
		const currentItem = currentUuid ? this.projectItems.get(currentUuid) : undefined
		const endBehavior = currentItem?.endBehavior?.action ?? 'nothing'
		this.autoNextItemUuid =
			currentUuid && endBehavior === 'next' ? (this.findNextSibling(currentUuid)?.uuid ?? '') || null : null
	}

	// === Cleanup ===

	clear(): void {
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
		this.selectedItemUuid = null
		this.nextItemUuid = null
		this.autoNextItemUuid = null
		this.masterGainDb = 0
	}
}
