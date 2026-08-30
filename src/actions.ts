import { TransportState } from './websocket-client.js'
import type ModuleInstance from './main.js'
import { type CueLookupOptions, resolveCue, resolveToCueId, resolveUuid, cueOptions } from './cue-utils.js'

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

// Helper: simple cue transport action (play/stop/pause/resume)
function cueTransportAction(
	self: ModuleInstance,
	name: string,
	description: string,
	type: 'play' | 'stop' | 'pause' | 'resume',
) {
	return {
		name,
		description,
		options: cueOptions(),
		callback: (event: { options: CueLookupOptions }) => {
			const target = resolveCue(self, event.options)
			if (!target) return
			self.webSocketClient?.send({ type, ...target })
		},
	}
}

// Helper: mode toggle action
function modeToggleAction(
	self: ModuleInstance,
	name: string,
	description: string,
	property: 'noPlayMode' | 'previewMode' | 'nextMode',
) {
	return {
		name,
		description,
		options: [],
		callback: () => {
			self[property] = !self[property]
			self.log('info', `${name}: ${self[property] ? 'ON' : 'OFF'}`)
		},
	}
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		play_cue: cueTransportAction(self, 'Play Cue', 'Start playback of a cue', 'play'),
		stop_cue: cueTransportAction(self, 'Stop Cue', 'Stop playback of a cue', 'stop'),
		pause_cue: cueTransportAction(self, 'Pause Cue', 'Pause playback of a cue', 'pause'),
		resume_cue: cueTransportAction(self, 'Resume Cue', 'Resume paused playback of a cue', 'resume'),

		toggle_cue: {
			name: 'Toggle Play/Stop',
			description: 'Start playback if stopped, stop if playing',
			options: cueOptions(),
			callback: (event) => {
				const target = resolveCue(self, event.options)
				if (!target) return
				const cueId = resolveToCueId(self, event.options)
				const transport = cueId ? self.state.cueStates.get(cueId) : undefined
				const isPlaying = transport === TransportState.Playing || transport === TransportState.FadingOut
				self.webSocketClient?.send({ type: isPlaying ? 'stop' : 'play', ...target })
			},
			learn: () => {
				if (!self.state.selectedItemUuid) return undefined
				return { lookupMode: 'uuid' as const, cueId: self.state.selectedItemUuid }
			},
		},

		toggle_pause_cue: {
			name: 'Toggle Pause/Resume',
			description: 'Pause if playing, resume if paused',
			options: cueOptions(),
			callback: (event) => {
				const target = resolveCue(self, event.options)
				if (!target) return
				const cueId = resolveToCueId(self, event.options)
				const transport = cueId ? self.state.cueStates.get(cueId) : undefined
				self.webSocketClient?.send({ type: transport === TransportState.Paused ? 'resume' : 'pause', ...target })
			},
		},

		seek_cue: {
			name: 'Seek Cue',
			description: 'Seek to a specific position in seconds',
			options: [
				...cueOptions(),
				{ id: 'seconds', type: 'number', label: 'Position (seconds)', default: 0, min: 0, max: 86400 },
			],
			callback: (event) => {
				const target = resolveCue(self, event.options)
				if (!target) return
				self.webSocketClient?.send({ type: 'seek', ...target, seconds: event.options.seconds })
			},
		},

		set_cue_gain: {
			name: 'Set Cue Gain',
			description: 'Set the gain level for a cue in dB',
			options: [...cueOptions(), { id: 'db', type: 'number', label: 'Gain (dB)', default: 0, min: -60, max: 20 }],
			callback: (event) => {
				const target = resolveCue(self, event.options)
				if (!target) return
				self.webSocketClient?.send({ type: 'gain', ...target, db: event.options.db })
			},
		},

		set_cue_fade: {
			name: 'Set Cue Fade',
			description: 'Set fade in/out durations for a cue',
			options: [
				...cueOptions(),
				{ id: 'inMs', type: 'number', label: 'Fade In (ms)', default: 0, min: 0, max: 30000 },
				{ id: 'outMs', type: 'number', label: 'Fade Out (ms)', default: 0, min: 0, max: 30000 },
			],
			callback: (event) => {
				const target = resolveCue(self, event.options)
				if (!target) return
				self.webSocketClient?.send({ type: 'fade', ...target, in_ms: event.options.inMs, out_ms: event.options.outMs })
			},
		},

		stop_all: {
			name: 'Stop All',
			description: 'Stop all currently playing cues',
			options: [],
			callback: () => self.webSocketClient?.send({ type: 'stop_all' }),
		},

		set_master_gain: {
			name: 'Set Master Gain',
			description: 'Set the master output gain in dB',
			options: [{ id: 'db', type: 'number', label: 'Master Gain (dB)', default: 0, min: -60, max: 20 }],
			callback: (event) => void self.apiClient?.setMasterGain(event.options.db),
		},

		toggle_no_play: modeToggleAction(
			self,
			'Toggle No-Play Mode',
			'Switch between normal and no-play mode for button setup',
			'noPlayMode',
		),
		toggle_preview_mode: modeToggleAction(
			self,
			'Toggle Preview Mode',
			'Switch between normal and preview mode (pre-listen)',
			'previewMode',
		),
		toggle_next_mode: modeToggleAction(
			self,
			'Toggle Next Mode',
			'Switch between normal and next mode (set Up Next)',
			'nextMode',
		),

		play_cue_preview: {
			name: 'Play Cue Preview',
			description: 'Start preview playback for a cue (DJ-style pre-listen)',
			options: cueOptions(),
			callback: (event) => {
				const uuid = resolveUuid(self, event.options)
				if (uuid) void self.apiClient?.startPreview(uuid)
			},
		},

		stop_cue_preview: {
			name: 'Stop Cue Preview',
			description: 'Stop preview playback',
			options: [],
			callback: () => void self.apiClient?.stopPreview(),
		},

		toggle_cue_preview: {
			name: 'Toggle Cue Preview',
			description: 'Toggle preview playback for a cue',
			options: cueOptions(),
			callback: (event) => {
				const uuid = resolveUuid(self, event.options)
				if (!uuid) return
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
				const target = resolveCue(self, event.options)
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
				const target = resolveCue(self, event.options)
				if (!target?.item_uuid) {
					self.log('warn', 'Toggle Next: no item resolved')
					return
				}
				self.webSocketClient?.send({
					type: 'set_next_item',
					item_uuid: self.state.nextItemUuid === target.item_uuid ? '' : target.item_uuid,
				})
			},
		},

		reset_next_item: {
			name: 'Reset Next Item',
			description: 'Clear the "Up Next" target',
			options: [],
			callback: () => self.webSocketClient?.send({ type: 'set_next_item', item_uuid: '' }),
		},
	})
}
