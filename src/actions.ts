import type { CompanionOptionValues, SomeCompanionActionInputField } from '@companion-module/base'
import { TransportState } from './websocket-client.js'
import type ModuleInstance from './main.js'

type LookupMode = 'uuid' | 'cue_id' | 'index' | 'selected'

interface CueLookupOptions extends CompanionOptionValues {
	lookupMode: LookupMode
	cueId: string
}

function resolveCue(self: ModuleInstance, opts: CueLookupOptions): { item_uuid?: string; cue_id?: string } | null {
	switch (opts.lookupMode) {
		case 'uuid':
			if (!opts.cueId) return null
			return { item_uuid: opts.cueId }
		case 'cue_id':
			if (!opts.cueId) return null
			return { cue_id: opts.cueId }
		case 'index': {
			if (!opts.cueId) return null
			const item = self.state.findItemByIndex(opts.cueId)
			if (!item) {
				self.log('warn', `No item found at index path: ${opts.cueId}`)
				return null
			}
			return { item_uuid: item.uuid }
		}
		case 'selected': {
			const uuid = self.state.selectedItemUuid
			if (!uuid) {
				self.log('warn', 'No item selected in LivePlay')
				return null
			}
			return { item_uuid: uuid }
		}
	}
}

function resolveToCueId(self: ModuleInstance, opts: CueLookupOptions): string | null {
	switch (opts.lookupMode) {
		case 'uuid':
			if (!opts.cueId) return null
			return self.state.uuidToCueId.get(opts.cueId) ?? opts.cueId
		case 'cue_id':
			if (!opts.cueId) return null
			return opts.cueId
		case 'index': {
			if (!opts.cueId) return null
			const item = self.state.findItemByIndex(opts.cueId)
			if (!item) return null
			if (item.cueId) return item.cueId
			return self.state.uuidToCueId.get(item.uuid) ?? null
		}
		case 'selected': {
			const uuid = self.state.selectedItemUuid
			if (!uuid) return null
			return self.state.uuidToCueId.get(uuid) ?? null
		}
	}
}

function resolvePreviewUuid(self: ModuleInstance, opts: CueLookupOptions): string | undefined {
	switch (opts.lookupMode) {
		case 'uuid':
			return opts.cueId || undefined
		case 'cue_id': {
			const foundUuid = self.state.cueIdToUuid.get(opts.cueId)
			return foundUuid ?? opts.cueId
		}
		case 'index': {
			const item = self.state.findItemByIndex(opts.cueId)
			return item?.uuid
		}
		case 'selected':
			return self.state.selectedItemUuid ?? undefined
	}
}

function cueOptions(): SomeCompanionActionInputField[] {
	return [
		{
			id: 'lookupMode',
			type: 'dropdown',
			label: 'Lookup Mode',
			default: 'uuid',
			choices: [
				{ id: 'uuid', label: 'By UUID' },
				{ id: 'cue_id', label: 'By Engine Cue ID' },
				{ id: 'index', label: 'By Index (e.g. 0, 1,3)' },
				{ id: 'selected', label: 'Selected in LivePlay' },
			],
		},
		{
			id: 'cueId',
			type: 'textinput',
			label: 'Cue ID / UUID / Index (not needed for Selected mode)',
			default: '',
			useVariables: true,
		},
	]
}

export type ActionsSchema = {
	play_cue: { options: CueLookupOptions }
	stop_cue: { options: CueLookupOptions }
	pause_cue: { options: CueLookupOptions }
	resume_cue: { options: CueLookupOptions }
	toggle_cue: { options: CueLookupOptions }
	toggle_pause_cue: { options: CueLookupOptions }
	seek_cue: { options: CueLookupOptions & { seconds: number } }
	set_cue_gain: { options: CueLookupOptions & { db: number } }
	set_cue_fade: { options: CueLookupOptions & { inMs: number; outMs: number } }
	stop_all: { options: Record<string, never> }
	set_master_gain: { options: { db: number } }
	toggle_no_play: { options: Record<string, never> }
	toggle_preview_mode: { options: Record<string, never> }
	toggle_next_mode: { options: Record<string, never> }
	play_cue_preview: { options: CueLookupOptions }
	stop_cue_preview: { options: Record<string, never> }
	toggle_cue_preview: { options: CueLookupOptions }
	set_next_item: { options: CueLookupOptions }
	toggle_next_item: { options: CueLookupOptions }
	reset_next_item: { options: Record<string, never> }
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		play_cue: {
			name: 'Play Cue',
			description: 'Start playback of a cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'play', ...target })
			},
		},
		stop_cue: {
			name: 'Stop Cue',
			description: 'Stop playback of a cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'stop', ...target })
			},
		},
		pause_cue: {
			name: 'Pause Cue',
			description: 'Pause playback of a cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'pause', ...target })
			},
		},
		resume_cue: {
			name: 'Resume Cue',
			description: 'Resume paused playback of a cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'resume', ...target })
			},
		},
		toggle_cue: {
			name: 'Toggle Play/Stop',
			description: 'Start playback if stopped, stop if playing',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return

				const cueId = resolveToCueId(self, opts)
				const transport = cueId ? self.state.cueStates.get(cueId) : undefined
				const isPlaying = transport === TransportState.Playing || transport === TransportState.FadingOut

				self.webSocketClient?.send({ type: isPlaying ? 'stop' : 'play', ...target })
			},
			learn: () => {
				if (!self.state.selectedItemUuid) return undefined
				return {
					lookupMode: 'uuid' as const,
					cueId: self.state.selectedItemUuid,
				}
			},
		},
		toggle_pause_cue: {
			name: 'Toggle Pause/Resume',
			description: 'Pause if playing, resume if paused',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return

				const cueId = resolveToCueId(self, opts)
				const transport = cueId ? self.state.cueStates.get(cueId) : undefined

				self.webSocketClient?.send({ type: transport === TransportState.Paused ? 'resume' : 'pause', ...target })
			},
		},
		seek_cue: {
			name: 'Seek Cue',
			description: 'Seek to a specific position in seconds',
			options: [
				...cueOptions(),
				{
					id: 'seconds',
					type: 'number',
					label: 'Position (seconds)',
					default: 0,
					min: 0,
					max: 86400,
				},
			],
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'seek', ...target, seconds: opts.seconds })
			},
		},
		set_cue_gain: {
			name: 'Set Cue Gain',
			description: 'Set the gain level for a cue in dB',
			options: [
				...cueOptions(),
				{
					id: 'db',
					type: 'number',
					label: 'Gain (dB)',
					default: 0,
					min: -60,
					max: 20,
				},
			],
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'gain', ...target, db: opts.db })
			},
		},
		set_cue_fade: {
			name: 'Set Cue Fade',
			description: 'Set fade in/out durations for a cue',
			options: [
				...cueOptions(),
				{
					id: 'inMs',
					type: 'number',
					label: 'Fade In (ms)',
					default: 0,
					min: 0,
					max: 30000,
				},
				{
					id: 'outMs',
					type: 'number',
					label: 'Fade Out (ms)',
					default: 0,
					min: 0,
					max: 30000,
				},
			],
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'fade', ...target, in_ms: opts.inMs, out_ms: opts.outMs })
			},
		},
		stop_all: {
			name: 'Stop All',
			description: 'Stop all currently playing cues',
			options: [],
			callback: () => {
				self.webSocketClient?.send({ type: 'stop_all' })
			},
		},
		set_master_gain: {
			name: 'Set Master Gain',
			description: 'Set the master output gain in dB',
			options: [
				{
					id: 'db',
					type: 'number',
					label: 'Master Gain (dB)',
					default: 0,
					min: -60,
					max: 20,
				},
			],
			callback: (event) => {
				void self.apiClient?.setMasterGain(event.options.db)
			},
		},
		toggle_no_play: {
			name: 'Toggle No-Play Mode',
			description: 'Switch between normal and no-play mode for button setup',
			options: [],
			callback: () => {
				self.noPlayMode = !self.noPlayMode
				self.log('info', `No-Play mode: ${self.noPlayMode ? 'ON' : 'OFF'}`)
			},
		},
		toggle_preview_mode: {
			name: 'Toggle Preview Mode',
			description: 'Switch between normal and preview mode (pre-listen)',
			options: [],
			callback: () => {
				self.previewMode = !self.previewMode
				self.log('info', `Preview mode: ${self.previewMode ? 'ON' : 'OFF'}`)
			},
		},
		toggle_next_mode: {
			name: 'Toggle Next Mode',
			description: 'Switch between normal and next mode (set Up Next)',
			options: [],
			callback: () => {
				self.nextMode = !self.nextMode
				self.log('info', `Next mode: ${self.nextMode ? 'ON' : 'OFF'}`)
			},
		},
		play_cue_preview: {
			name: 'Play Cue Preview',
			description: 'Start preview playback for a cue (DJ-style pre-listen)',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const uuid = resolvePreviewUuid(self, opts)
				if (!uuid) return
				void self.apiClient?.startPreview(uuid)
			},
		},
		stop_cue_preview: {
			name: 'Stop Cue Preview',
			description: 'Stop preview playback',
			options: [],
			callback: () => {
				void self.apiClient?.stopPreview()
			},
		},
		toggle_cue_preview: {
			name: 'Toggle Cue Preview',
			description: 'Toggle preview playback for a cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const uuid = resolvePreviewUuid(self, opts)
				if (!uuid) return

				// If same cue is already previewing, stop it
				if (self.state.previewItemUuid === uuid) {
					void self.apiClient?.stopPreview()
				} else {
					void self.apiClient?.startPreview(uuid)
				}
			},
		},
		set_next_item: {
			name: 'Set Next Item',
			description: 'Set a cue as the "Up Next" target',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target?.item_uuid) {
					self.log('warn', 'Set Next: no item resolved')
					return
				}
				self.webSocketClient?.send({ type: 'set_next_item', item_uuid: target.item_uuid })
			},
		},
		toggle_next_item: {
			name: 'Toggle Next Item',
			description: 'Toggle a cue as "Up Next" (set if not next, clear if already next)',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options
				const target = resolveCue(self, opts)
				if (!target?.item_uuid) {
					self.log('warn', 'Toggle Next: no item resolved')
					return
				}

				// If this item is already next, clear it
				if (self.state.nextItemUuid === target.item_uuid) {
					self.webSocketClient?.send({ type: 'set_next_item', item_uuid: '' })
				} else {
					self.webSocketClient?.send({ type: 'set_next_item', item_uuid: target.item_uuid })
				}
			},
		},
		reset_next_item: {
			name: 'Reset Next Item',
			description: 'Clear the "Up Next" target',
			options: [],
			callback: () => {
				self.webSocketClient?.send({ type: 'set_next_item', item_uuid: '' })
			},
		},
	})
}
