import type {
	CompanionActionSchema,
	CompanionOptionValues,
	SomeCompanionActionInputField,
} from '@companion-module/base'
import { TransportState } from './websocket-client.js'
import type ModuleInstance from './main.js'

type LookupMode = 'uuid' | 'cue_id' | 'index'

interface CueLookupOptions extends CompanionOptionValues {
	lookupMode: LookupMode
	cueId: string
}

function resolveCue(self: ModuleInstance, opts: CueLookupOptions): { item_uuid?: string; cue_id?: string } | null {
	if (!opts.cueId) return null

	switch (opts.lookupMode) {
		case 'uuid':
			return { item_uuid: opts.cueId }
		case 'cue_id':
			return { cue_id: opts.cueId }
		case 'index': {
			const item = self.state.findItemByIndex(opts.cueId)
			if (!item) {
				self.log('warn', `No item found at index path: ${opts.cueId}`)
				return null
			}
			return { item_uuid: item.uuid }
		}
	}
}

function resolveToCueId(self: ModuleInstance, opts: CueLookupOptions): string | null {
	if (!opts.cueId) return null

	switch (opts.lookupMode) {
		case 'uuid':
			return self.state.uuidToCueId.get(opts.cueId) ?? opts.cueId
		case 'cue_id':
			return opts.cueId
		case 'index': {
			const item = self.state.findItemByIndex(opts.cueId)
			if (!item) return null
			if (item.cueId) return item.cueId
			return self.state.uuidToCueId.get(item.uuid) ?? null
		}
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
			],
		},
		{
			id: 'cueId',
			type: 'textinput',
			label: 'Cue ID / UUID / Index',
			default: '',
			useVariables: true,
		},
	]
}

export type ActionsSchema = Record<string, CompanionActionSchema<CompanionOptionValues>>

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		play_cue: {
			name: 'Play Cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options as unknown as CueLookupOptions
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'play', ...target })
			},
		},
		stop_cue: {
			name: 'Stop Cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options as unknown as CueLookupOptions
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'stop', ...target })
			},
		},
		pause_cue: {
			name: 'Pause Cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options as unknown as CueLookupOptions
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'pause', ...target })
			},
		},
		resume_cue: {
			name: 'Resume Cue',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options as unknown as CueLookupOptions
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'resume', ...target })
			},
		},
		toggle_cue: {
			name: 'Toggle Play/Stop',
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options as unknown as CueLookupOptions
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
			options: cueOptions(),
			callback: (event) => {
				const opts = event.options as unknown as CueLookupOptions
				const target = resolveCue(self, opts)
				if (!target) return

				const cueId = resolveToCueId(self, opts)
				const transport = cueId ? self.state.cueStates.get(cueId) : undefined

				self.webSocketClient?.send({ type: transport === TransportState.Paused ? 'resume' : 'pause', ...target })
			},
		},
		seek_cue: {
			name: 'Seek Cue',
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
				const opts = event.options as unknown as CueLookupOptions & { seconds: number }
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'seek', ...target, seconds: opts.seconds })
			},
		},
		set_cue_gain: {
			name: 'Set Cue Gain',
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
				const opts = event.options as unknown as CueLookupOptions & { db: number }
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'gain', ...target, db: opts.db })
			},
		},
		set_cue_fade: {
			name: 'Set Cue Fade',
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
				const opts = event.options as unknown as CueLookupOptions & { inMs: number; outMs: number }
				const target = resolveCue(self, opts)
				if (!target) return
				self.webSocketClient?.send({ type: 'fade', ...target, in_ms: opts.inMs, out_ms: opts.outMs })
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
				void self.apiClient?.setMasterGain(event.options.db as number)
			},
		},
	})
}
