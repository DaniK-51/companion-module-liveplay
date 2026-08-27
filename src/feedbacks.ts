import { InstanceStatus } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { TransportState } from './websocket-client.js'

export type FeedbacksSchema = {
	connection_status: {
		type: 'boolean'
		options: Record<string, never>
	}
	any_cue_playing: {
		type: 'boolean'
		options: Record<string, never>
	}
	any_cue_paused: {
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
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		connection_status: {
			name: 'Connected to Server',
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
		any_cue_playing: {
			name: 'Any Cue Playing',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return self.cueStates.size > 0 && Array.from(self.cueStates.values()).some((t) => t === TransportState.Playing)
			},
		},
		any_cue_paused: {
			name: 'Any Cue Paused',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xffff00,
				color: 0x000000,
			},
			options: [],
			callback: () => {
				return Array.from(self.cueStates.values()).some((t) => t === TransportState.Paused)
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
			callback: (feedback) => {
				const opts = feedback.options
				if (!opts.cueId) return false
				const lookupKey = opts.useUuid ? (self.uuidToCueId.get(opts.cueId) ?? opts.cueId) : opts.cueId
				return self.cueStates.get(lookupKey) === TransportState.Playing
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
			callback: (feedback) => {
				const opts = feedback.options
				if (!opts.cueId) return false
				const lookupKey = opts.useUuid ? (self.uuidToCueId.get(opts.cueId) ?? opts.cueId) : opts.cueId
				return self.cueStates.get(lookupKey) === TransportState.Paused
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
			callback: (feedback) => {
				const opts = feedback.options
				if (!opts.cueId) return false
				const lookupKey = opts.useUuid ? (self.uuidToCueId.get(opts.cueId) ?? opts.cueId) : opts.cueId
				const state = self.cueStates.get(lookupKey)
				return state === undefined || state === TransportState.Stopped
			},
		},
	})
}
