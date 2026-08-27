import { TransportState } from './websocket-client.js'
import type ModuleInstance from './main.js'

export type ActionsSchema = {
	play_cue: {
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	stop_cue: {
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	pause_cue: {
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	resume_cue: {
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	toggle_cue: {
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	toggle_pause_cue: {
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	seek_cue: {
		options: {
			cueId: string
			useUuid: boolean
			seconds: number
		}
	}
	set_cue_gain: {
		options: {
			cueId: string
			useUuid: boolean
			db: number
		}
	}
	set_cue_fade: {
		options: {
			cueId: string
			useUuid: boolean
			inMs: number
			outMs: number
		}
	}
	stop_all: {
		options: Record<string, never>
	}
	set_master_gain: {
		options: {
			db: number
		}
	}
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		play_cue: {
			name: 'Play Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
			],
			callback: (event) => {
				const opts = event.options
				if (!opts.cueId) {
					self.log('warn', 'Play Cue: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'play', item_uuid: opts.cueId })
				} else {
					self.webSocketClient?.send({ type: 'play', cue_id: opts.cueId })
				}
			},
		},
		stop_cue: {
			name: 'Stop Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
			],
			callback: (event) => {
				const opts = event.options
				if (!opts.cueId) {
					self.log('warn', 'Stop Cue: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'stop', item_uuid: opts.cueId })
				} else {
					self.webSocketClient?.send({ type: 'stop', cue_id: opts.cueId })
				}
			},
		},
		pause_cue: {
			name: 'Pause Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
			],
			callback: (event) => {
				const opts = event.options
				if (!opts.cueId) {
					self.log('warn', 'Pause Cue: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'pause', item_uuid: opts.cueId })
				} else {
					self.webSocketClient?.send({ type: 'pause', cue_id: opts.cueId })
				}
			},
		},
		resume_cue: {
			name: 'Resume Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
			],
			callback: (event) => {
				const opts = event.options
				if (!opts.cueId) {
					self.log('warn', 'Resume Cue: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'resume', item_uuid: opts.cueId })
				} else {
					self.webSocketClient?.send({ type: 'resume', cue_id: opts.cueId })
				}
			},
		},
		toggle_cue: {
			name: 'Toggle Play/Stop',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
			],
			callback: (event) => {
				const opts = event.options
				if (!opts.cueId) {
					self.log('warn', 'Toggle Cue: no cue ID provided')
					return
				}

				const lookupKey = opts.useUuid ? (self.uuidToCueId.get(opts.cueId) ?? opts.cueId) : opts.cueId
				const transport = self.cueStates.get(lookupKey)
				const isPlaying = transport === TransportState.Playing || transport === TransportState.FadingOut

				if (isPlaying) {
					if (opts.useUuid) {
						self.webSocketClient?.send({ type: 'stop', item_uuid: opts.cueId })
					} else {
						self.webSocketClient?.send({ type: 'stop', cue_id: opts.cueId })
					}
				} else {
					if (opts.useUuid) {
						self.webSocketClient?.send({ type: 'play', item_uuid: opts.cueId })
					} else {
						self.webSocketClient?.send({ type: 'play', cue_id: opts.cueId })
					}
				}
			},
		},
		toggle_pause_cue: {
			name: 'Toggle Pause/Resume',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
			],
			callback: (event) => {
				const opts = event.options
				if (!opts.cueId) {
					self.log('warn', 'Toggle Pause: no cue ID provided')
					return
				}

				const lookupKey = opts.useUuid ? (self.uuidToCueId.get(opts.cueId) ?? opts.cueId) : opts.cueId
				const transport = self.cueStates.get(lookupKey)

				if (transport === TransportState.Paused) {
					if (opts.useUuid) {
						self.webSocketClient?.send({ type: 'resume', item_uuid: opts.cueId })
					} else {
						self.webSocketClient?.send({ type: 'resume', cue_id: opts.cueId })
					}
				} else {
					if (opts.useUuid) {
						self.webSocketClient?.send({ type: 'pause', item_uuid: opts.cueId })
					} else {
						self.webSocketClient?.send({ type: 'pause', cue_id: opts.cueId })
					}
				}
			},
		},
		seek_cue: {
			name: 'Seek Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
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
				if (!opts.cueId) {
					self.log('warn', 'Seek Cue: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'seek', item_uuid: opts.cueId, seconds: opts.seconds })
				} else {
					self.webSocketClient?.send({ type: 'seek', cue_id: opts.cueId, seconds: opts.seconds })
				}
			},
		},
		set_cue_gain: {
			name: 'Set Cue Gain',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
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
				if (!opts.cueId) {
					self.log('warn', 'Set Cue Gain: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'gain', item_uuid: opts.cueId, db: opts.db })
				} else {
					self.webSocketClient?.send({ type: 'gain', cue_id: opts.cueId, db: opts.db })
				}
			},
		},
		set_cue_fade: {
			name: 'Set Cue Fade',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID or UUID',
					default: '',
					useVariables: true,
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID (uncheck for engine cue_id)',
					default: true,
				},
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
				if (!opts.cueId) {
					self.log('warn', 'Set Cue Fade: no cue ID provided')
					return
				}
				if (opts.useUuid) {
					self.webSocketClient?.send({ type: 'fade', item_uuid: opts.cueId, in_ms: opts.inMs, out_ms: opts.outMs })
				} else {
					self.webSocketClient?.send({ type: 'fade', cue_id: opts.cueId, in_ms: opts.inMs, out_ms: opts.outMs })
				}
			},
		},
		stop_all: {
			name: 'Stop All',
			options: [],
			callback: () => {
				self.webSocketClient?.send({ type: 'stop_all' })
			},
		},
		set_master_gain: {
			name: 'Set Master Gain',
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
				const opts = event.options
				void self.apiClient?.setMasterGain(opts.db)
			},
		},
	})
}
