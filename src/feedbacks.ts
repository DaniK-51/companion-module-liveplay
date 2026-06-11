import { InstanceStatus } from '@companion-module/base'
import type ModuleInstance from './main.js'

export type FeedbacksSchema = {
	is_playing: {
		type: 'boolean'
		options: Record<string, never>
	}
	is_paused: {
		type: 'boolean'
		options: Record<string, never>
	}
	is_stopped: {
		type: 'boolean'
		options: Record<string, never>
	}
	connection_status: {
		type: 'boolean'
		options: Record<string, never>
	}
	project_loaded: {
		type: 'boolean'
		options: Record<string, never>
	}
	cue_is_playing: {
		type: 'boolean'
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	cue_is_paused: {
		type: 'boolean'
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	cue_is_stopped: {
		type: 'boolean'
		options: {
			cueId: string
			useUuid: boolean
		}
	}
	current_position: {
		type: 'boolean'
		options: {
			minValue: number
			maxValue: number
		}
	}
	current_duration: {
		type: 'boolean'
		options: {
			minValue: number
			maxValue: number
		}
	}
	current_progress: {
		type: 'boolean'
		options: {
			minValue: number
			maxValue: number
		}
	}
	master_volume: {
		type: 'boolean'
		options: {
			minValue: number
			maxValue: number
		}
	}
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		is_playing: {
			name: 'Is Playing',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.currentPlayerState.state === 'playing'
			},
		},
		is_paused: {
			name: 'Is Paused',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xffff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.currentPlayerState.state === 'paused'
			},
		},
		is_stopped: {
			name: 'Is Stopped',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.currentPlayerState.state === 'stopped'
			},
		},
		connection_status: {
			name: 'Connection Status',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.connectionStatus === InstanceStatus.Ok
			},
		},
		project_loaded: {
			name: 'Project Loaded',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				// Will be populated when we have project data
				return false // Placeholder until project loading is implemented
			},
		},
		cue_is_playing: {
			name: 'Cue Is Playing',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
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
			callback: (feedback) => {
				const options = feedback.options as any
				return self.playingCues.has(options.cueId)
			},
		},
		cue_is_paused: {
			name: 'Cue Is Paused',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xffff00,
				color: 0x000000,
			},
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
			callback: (_feedback) => {
				// Will be implemented when we have paused cue tracking
				return false // Placeholder until paused cue tracking is implemented
			},
		},
		cue_is_stopped: {
			name: 'Cue Is Stopped',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0x000000,
			},
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
			callback: (feedback) => {
				const options = feedback.options as any
				return !self.playingCues.has(options.cueId)
			},
		},
		current_position: {
			name: 'Current Position',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x0080ff,
				color: 0x000000,
			},
			options: [
				{
					id: 'minValue',
					type: 'number',
					label: 'Min Value (seconds)',
					default: 0,
					min: 0,
					max: 86400,
				},
				{
					id: 'maxValue',
					type: 'number',
					label: 'Max Value (seconds)',
					default: 60,
					min: 0,
					max: 86400,
				},
			],
			callback: (feedback) => {
				const options = feedback.options as any
				const position = self.currentPlayerState.position
				return position >= options.minValue && position <= options.maxValue
			},
		},
		current_duration: {
			name: 'Current Duration',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x8000ff,
				color: 0x000000,
			},
			options: [
				{
					id: 'minValue',
					type: 'number',
					label: 'Min Value (seconds)',
					default: 0,
					min: 0,
					max: 86400,
				},
				{
					id: 'maxValue',
					type: 'number',
					label: 'Max Value (seconds)',
					default: 300,
					min: 0,
					max: 86400,
				},
			],
			callback: (feedback) => {
				const options = feedback.options as any
				const duration = self.currentPlayerState.duration
				return duration >= options.minValue && duration <= options.maxValue
			},
		},
		current_progress: {
			name: 'Current Progress',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff8000,
				color: 0x000000,
			},
			options: [
				{
					id: 'minValue',
					type: 'number',
					label: 'Min Value (%)',
					default: 0,
					min: 0,
					max: 100,
				},
				{
					id: 'maxValue',
					type: 'number',
					label: 'Max Value (%)',
					default: 100,
					min: 0,
					max: 100,
				},
			],
			callback: (feedback) => {
				const options = feedback.options as any
				const progress = self.currentPlayerState.progress
				return progress >= options.minValue && progress <= options.maxValue
			},
		},
		master_volume: {
			name: 'Master Volume',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff80,
				color: 0x000000,
			},
			options: [
				{
					id: 'minValue',
					type: 'number',
					label: 'Min Value (dB)',
					default: -60,
					min: -60,
					max: 20,
				},
				{
					id: 'maxValue',
					type: 'number',
					label: 'Max Value (dB)',
					default: 0,
					min: -60,
					max: 20,
				},
			],
			callback: (feedback) => {
				const options = feedback.options as any
				const volume = self.currentPlayerState.masterVolume
				return volume >= options.minValue && volume <= options.maxValue
			},
		},
	})
}
