import type { CompanionFeedbackDefinitions, CompanionOptionValues } from '@companion-module/base'
import { InstanceStatus } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { TransportState } from './websocket-client.js'

type LookupMode = 'uuid' | 'cue_id' | 'index' | 'selected'

interface CueLookupOptions extends CompanionOptionValues {
	lookupMode: LookupMode
	cueId: string
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

function cueOptions() {
	return [
		{
			id: 'lookupMode',
			type: 'dropdown' as const,
			label: 'Lookup Mode',
			default: 'uuid' as LookupMode,
			choices: [
				{ id: 'uuid', label: 'By UUID' },
				{ id: 'cue_id', label: 'By Engine Cue ID' },
				{ id: 'index', label: 'By Index (e.g. 0, 1,3)' },
				{ id: 'selected', label: 'Selected in LivePlay' },
			],
		},
		{
			id: 'cueId',
			type: 'textinput' as const,
			label: 'Cue ID / UUID / Index (not needed for Selected mode)',
			default: '',
			useVariables: true,
		},
	]
}

export type FeedbacksSchema = Record<string, { type: 'boolean'; options: CompanionOptionValues }>

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
				const states = self.state.cueStates
				return states.size > 0 && Array.from(states.values()).some((t) => t === TransportState.Playing)
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
				return Array.from(self.state.cueStates.values()).some((t) => t === TransportState.Paused)
			},
		},
		cue_is_playing: {
			name: 'Cue Is Playing',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
			},
			options: cueOptions(),
			callback: (feedback) => {
				const opts = feedback.options as unknown as CueLookupOptions
				const cueId = resolveToCueId(self, opts)
				if (!cueId) return false
				return self.state.cueStates.get(cueId) === TransportState.Playing
			},
		},
		cue_is_paused: {
			name: 'Cue Is Paused',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xffff00,
				color: 0x000000,
			},
			options: cueOptions(),
			callback: (feedback) => {
				const opts = feedback.options as unknown as CueLookupOptions
				const cueId = resolveToCueId(self, opts)
				if (!cueId) return false
				return self.state.cueStates.get(cueId) === TransportState.Paused
			},
		},
		cue_is_stopped: {
			name: 'Cue Is Stopped',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0x000000,
			},
			options: cueOptions(),
			callback: (feedback) => {
				const opts = feedback.options as unknown as CueLookupOptions
				const cueId = resolveToCueId(self, opts)
				if (!cueId) return true
				const state = self.state.cueStates.get(cueId)
				return state === undefined || state === TransportState.Stopped
			},
		},
		cue_ready_to_assign: {
			name: 'Cue Ready to Assign',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0x00ff00,
				color: 0x000000,
				text: 'Learn',
			},
			options: cueOptions(),
			callback: (feedback) => {
				const opts = feedback.options as unknown as CueLookupOptions
				if (opts.cueId) return false
				return self.state.selectedItemUuid !== null
			},
		},
	} satisfies CompanionFeedbackDefinitions)
}
