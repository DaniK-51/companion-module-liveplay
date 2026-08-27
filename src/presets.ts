import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection[] = [
		{
			id: 'playback',
			name: 'Playback',
			definitions: [
				{
					id: 'cue_controls',
					name: 'Cue Controls',
					description: 'Play/Stop toggle with learn-to-assign',
					type: 'simple',
					presets: ['play_stop_cue'],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	presets['play_stop_cue'] = {
		type: 'simple',
		name: 'Play / Stop Cue (Learn)',
		style: {
			text: '',
			size: 'auto',
			color: 0xffffff,
			bgcolor: 0x000000,
		},
		localVariables: [
			{
				variableName: 'cue_id',
				variableType: 'simple',
				startupValue: '',
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'toggle_cue',
						options: {
							lookupMode: 'uuid',
							cueId: '$(local:cue_id)',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'cue_ready_to_assign',
				options: {
					lookupMode: 'uuid',
					cueId: '$(local:cue_id)',
				},
				style: {
					bgcolor: 0x00ff00,
					color: 0x000000,
					text: 'Learn',
				},
			},
			{
				feedbackId: 'cue_is_playing',
				options: {
					lookupMode: 'uuid',
					cueId: '$(local:cue_id)',
				},
				style: {
					bgcolor: 0x00ff00,
					color: 0x000000,
				},
			},
			{
				feedbackId: 'cue_is_paused',
				options: {
					lookupMode: 'uuid',
					cueId: '$(local:cue_id)',
				},
				style: {
					bgcolor: 0xffff00,
					color: 0x000000,
				},
			},
		],
	}

	self.setPresetDefinitions(structure, presets)
}
