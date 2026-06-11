import type ModuleInstance from './main.js'

export type ActionsSchema = {
	play_cue: {
		options: {
			cueId: string
			useUuid: boolean
			fadeTime: number
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
	seek_cue: {
		options: {
			cueId: string
			position: number
			useUuid: boolean
		}
	}
	stop_all: {
		options: Record<string, never>
	}
	play: {
		options: Record<string, never>
	}
	pause: {
		options: Record<string, never>
	}
	next: {
		options: Record<string, never>
	}
	previous: {
		options: Record<string, never>
	}
	set_master_gain: {
		options: {
			gainDb: number
		}
	}
	play_cart: {
		options: {
			slot: number
		}
	}
	clear_cart: {
		options: {
			slot: number
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
					label: 'Cue ID',
					default: '',
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID instead of Cue ID',
					default: true,
				},
				{
					id: 'fadeTime',
					type: 'number',
					label: 'Fade Time (ms)',
					default: 0,
					min: 0,
					max: 10000,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.playCue(options.cueId, options.useUuid, options.fadeTime)
						self.log('info', `Playing cue: ${options.cueId}`)
					}
				} catch (error) {
					self.log('error', `Failed to play cue: ${error}`)
				}
			},
		},
		stop_cue: {
			name: 'Stop Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID',
					default: '',
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID instead of Cue ID',
					default: true,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.stopCue(options.cueId, options.useUuid)
						self.log('info', `Stopping cue: ${options.cueId}`)
					}
				} catch (error) {
					self.log('error', `Failed to stop cue: ${error}`)
				}
			},
		},
		pause_cue: {
			name: 'Pause Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID',
					default: '',
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID instead of Cue ID',
					default: true,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.pauseCue(options.cueId, options.useUuid)
						self.log('info', `Pausing cue: ${options.cueId}`)
					}
				} catch (error) {
					self.log('error', `Failed to pause cue: ${error}`)
				}
			},
		},
		resume_cue: {
			name: 'Resume Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID',
					default: '',
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID instead of Cue ID',
					default: true,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.resumeCue(options.cueId, options.useUuid)
						self.log('info', `Resuming cue: ${options.cueId}`)
					}
				} catch (error) {
					self.log('error', `Failed to resume cue: ${error}`)
				}
			},
		},
		seek_cue: {
			name: 'Seek Cue',
			options: [
				{
					id: 'cueId',
					type: 'textinput',
					label: 'Cue ID',
					default: '',
				},
				{
					id: 'useUuid',
					type: 'checkbox',
					label: 'Use UUID instead of Cue ID',
					default: true,
				},
				{
					id: 'position',
					type: 'number',
					label: 'Position (seconds)',
					default: 0,
					min: 0,
					max: 86400,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.seekCue(options.cueId, options.position, options.useUuid)
						self.log('info', `Seeking cue ${options.cueId} to position: ${options.position}s`)
					}
				} catch (error) {
					self.log('error', `Failed to seek cue: ${error}`)
				}
			},
		},
		stop_all: {
			name: 'Stop All',
			options: [],
			callback: async () => {
				try {
					if (self.apiClient) {
						await self.apiClient.stopAll()
						self.log('info', 'Stopped all cues')
					}
				} catch (error) {
					self.log('error', `Failed to stop all cues: ${error}`)
				}
			},
		},
		play: {
			name: 'Play',
			options: [],
			callback: async () => {
				try {
					if (self.apiClient) {
						await self.apiClient.play()
						self.log('info', 'Started playback')
					}
				} catch (error) {
					self.log('error', `Failed to start playback: ${error}`)
				}
			},
		},
		pause: {
			name: 'Pause',
			options: [],
			callback: async () => {
				try {
					if (self.apiClient) {
						await self.apiClient.pause()
						self.log('info', 'Paused playback')
					}
				} catch (error) {
					self.log('error', `Failed to pause playback: ${error}`)
				}
			},
		},
		next: {
			name: 'Next',
			options: [],
			callback: async () => {
				try {
					if (self.apiClient) {
						await self.apiClient.next()
						self.log('info', 'Playing next cue')
					}
				} catch (error) {
					self.log('error', `Failed to play next cue: ${error}`)
				}
			},
		},
		previous: {
			name: 'Previous',
			options: [],
			callback: async () => {
				try {
					if (self.apiClient) {
						await self.apiClient.previous()
						self.log('info', 'Playing previous cue')
					}
				} catch (error) {
					self.log('error', `Failed to play previous cue: ${error}`)
				}
			},
		},
		set_master_gain: {
			name: 'Set Master Volume',
			options: [
				{
					id: 'gainDb',
					type: 'number',
					label: 'Gain (dB)',
					default: 0,
					min: -60,
					max: 20,
					step: 0.1,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.setMasterGain(options.gainDb)
						self.log('info', `Set master gain to: ${options.gainDb}dB`)
					}
				} catch (error) {
					self.log('error', `Failed to set master gain: ${error}`)
				}
			},
		},
		play_cart: {
			name: 'Play Cart',
			options: [
				{
					id: 'slot',
					type: 'number',
					label: 'Cart Slot',
					default: 1,
					min: 1,
					max: 16,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.playCart(options.slot)
						self.log('info', `Playing cart slot: ${options.slot}`)
					}
				} catch (error) {
					self.log('error', `Failed to play cart slot: ${error}`)
				}
			},
		},
		clear_cart: {
			name: 'Clear Cart',
			options: [
				{
					id: 'slot',
					type: 'number',
					label: 'Cart Slot',
					default: 1,
					min: 1,
					max: 16,
				},
			],
			callback: async (event) => {
				try {
					const options = event.options as any
					if (self.apiClient) {
						await self.apiClient.clearCart(options.slot)
						self.log('info', `Cleared cart slot: ${options.slot}`)
					}
				} catch (error) {
					self.log('error', `Failed to clear cart slot: ${error}`)
				}
			},
		},
	})
}
