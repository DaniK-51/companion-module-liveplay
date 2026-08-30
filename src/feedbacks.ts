import type { CompanionFeedbackDefinitions, CompanionOptionValues } from '@companion-module/base'
import { InstanceStatus } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { TransportState } from './websocket-client.js'
import { type CueLookupOptions, resolveToCueId, resolveUuid, feedbackCueOptions } from './cue-utils.js'

export type FeedbacksSchema = Record<string, { type: 'boolean'; options: CompanionOptionValues }>

// Helper: cue transport feedback (playing/paused/stopped)
function cueTransportFeedback(
	self: ModuleInstance,
	name: string,
	description: string,
	bgcolor: number,
	state: TransportState,
) {
	return {
		name,
		description,
		type: 'boolean' as const,
		defaultStyle: { bgcolor, color: 0x000000 },
		options: feedbackCueOptions(),
		callback: (feedback: { options: CompanionOptionValues }) => {
			const opts = feedback.options as unknown as CueLookupOptions
			const cueId = resolveToCueId(self, opts)
			if (!cueId) return state === TransportState.Stopped
			return self.state.cueStates.get(cueId) === state
		},
	}
}

// Helper: mode assigned feedback
function modeAssignedFeedback(
	self: ModuleInstance,
	name: string,
	description: string,
	bgcolor: number,
	labelColor: number,
	property: 'noPlayMode' | 'previewMode' | 'nextMode',
) {
	return {
		name,
		description,
		type: 'boolean' as const,
		defaultStyle: { bgcolor, color: labelColor },
		options: feedbackCueOptions(),
		callback: (feedback: { options: CompanionOptionValues }) => {
			if (!self[property]) return false
			const opts = feedback.options as unknown as CueLookupOptions
			return !!opts.cueId
		},
	}
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		connection_status: {
			name: 'Connected to Server',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [],
			callback: () => self.connectionStatus === InstanceStatus.Ok,
		},

		any_cue_playing: {
			name: 'Any Cue Playing',
			description: 'Active when any cue is playing',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000 },
			options: [],
			callback: () => {
				const states = self.state.cueStates
				return states.size > 0 && Array.from(states.values()).some((t) => t === TransportState.Playing)
			},
		},

		any_cue_paused: {
			name: 'Any Cue Paused',
			description: 'Active when any cue is paused',
			type: 'boolean',
			defaultStyle: { bgcolor: 0xffff00, color: 0x000000 },
			options: [],
			callback: () => Array.from(self.state.cueStates.values()).some((t) => t === TransportState.Paused),
		},

		cue_is_playing: cueTransportFeedback(
			self,
			'Cue Is Playing',
			'Active when the specified cue is playing',
			0x00ff00,
			TransportState.Playing,
		),
		cue_is_paused: cueTransportFeedback(
			self,
			'Cue Is Paused',
			'Active when the specified cue is paused',
			0xffff00,
			TransportState.Paused,
		),
		cue_is_stopped: cueTransportFeedback(
			self,
			'Cue Is Stopped',
			'Active when the specified cue is stopped',
			0xff0000,
			TransportState.Stopped,
		),

		cue_ready_to_assign: {
			name: 'Cue Ready to Assign',
			description: 'Active when no cue is assigned and one is selected in LivePlay',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x00ff00, color: 0x000000, text: 'Learn' },
			options: feedbackCueOptions(),
			callback: (feedback) => {
				const opts = feedback.options as unknown as CueLookupOptions
				if (opts.cueId) return false
				return self.state.selectedItemUuid !== null
			},
		},

		no_play_active: {
			name: 'No-Play Mode Active',
			description: 'Active when no-play mode is enabled',
			type: 'boolean',
			defaultStyle: { bgcolor: 0xff8800, color: 0x000000 },
			options: [],
			callback: () => self.noPlayMode,
		},

		no_play_assigned: modeAssignedFeedback(
			self,
			'No-Play Mode: Assigned',
			'Active when no-play mode is on and a cue is assigned',
			0x0066ff,
			0xffffff,
			'noPlayMode',
		),

		preview_mode_active: {
			name: 'Preview Mode Active',
			description: 'Active when preview mode is enabled',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x9933ff, color: 0xffffff },
			options: [],
			callback: () => self.previewMode,
		},

		preview_mode_assigned: modeAssignedFeedback(
			self,
			'Preview Mode: Assigned',
			'Active when preview mode is on and a cue is assigned',
			0x9933ff,
			0xffffff,
			'previewMode',
		),

		next_mode_active: {
			name: 'Next Mode Active',
			description: 'Active when next mode is enabled',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x00ccff, color: 0x000000 },
			options: [],
			callback: () => self.nextMode,
		},

		next_mode_assigned: modeAssignedFeedback(
			self,
			'Next Mode: Assigned',
			'Active when next mode is on and a cue is assigned',
			0x00ccff,
			0x000000,
			'nextMode',
		),

		cue_is_next: {
			name: 'Cue Is Next',
			description: 'Active when the cue is set as next (manual or auto)',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x00ccff, color: 0x000000 },
			options: feedbackCueOptions(),
			callback: (feedback) => {
				const opts = feedback.options as unknown as CueLookupOptions
				if (!opts.cueId) return false
				const uuid = resolveUuid(self, opts)
				if (!uuid) return false
				if (self.state.nextItemUuid === uuid) return true
				if (!self.state.nextItemUuid && self.state.autoNextItemUuid === uuid) return true
				return false
			},
		},
	} satisfies CompanionFeedbackDefinitions)
}
