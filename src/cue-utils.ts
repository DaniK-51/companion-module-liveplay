import type {
	CompanionOptionValues,
	SomeCompanionActionInputField,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base'
import type ModuleInstance from './main.js'

export type LookupMode = 'uuid' | 'cue_id' | 'index' | 'selected'

export interface CueLookupOptions extends CompanionOptionValues {
	lookupMode: LookupMode
	cueId: string
}

export function resolveCue(
	self: ModuleInstance,
	opts: CueLookupOptions,
): { item_uuid?: string; cue_id?: string } | null {
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

export function resolveToCueId(self: ModuleInstance, opts: CueLookupOptions): string | null {
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

export function resolveUuid(self: ModuleInstance, opts: CueLookupOptions): string | undefined {
	switch (opts.lookupMode) {
		case 'uuid':
			return opts.cueId || undefined
		case 'cue_id': {
			return self.state.cueIdToUuid.get(opts.cueId) ?? opts.cueId
		}
		case 'index': {
			const item = self.state.findItemByIndex(opts.cueId)
			return item?.uuid
		}
		case 'selected':
			return self.state.selectedItemUuid ?? undefined
	}
}

const CUE_OPTIONS = [
	{
		id: 'lookupMode',
		type: 'dropdown' as const,
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
		type: 'textinput' as const,
		label: 'Cue ID / UUID / Index (not needed for Selected mode)',
		default: '',
		useVariables: true,
	},
]

export function cueOptions(): SomeCompanionActionInputField[] {
	return CUE_OPTIONS
}

export function feedbackCueOptions(): SomeCompanionFeedbackInputField[] {
	return CUE_OPTIONS
}
