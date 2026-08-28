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
				{
					id: 'assign_controls',
					name: 'Assign & Toggle',
					description: 'Assign selected cue to button, then toggle',
					type: 'simple',
					presets: ['assign_and_toggle'],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	// Preset 1: Learn-to-assign (existing)
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

	// Preset 2: Assign & Toggle (uses internal Local Variable: Set value action)
	presets['assign_and_toggle'] = {
		type: 'simple',
		name: 'Assign & Toggle',
		style: {
			text: 'Assign',
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
					// Internal action: write selected_item_uuid to $(local:cue_id)
					{
						actionId: 'set_variable_value',
						options: {
							location: '$(this:page)/$(this:row)/$(this:column)',
							variable: 'cue_id',
							value: '$(liveplay:selected_item_uuid)',
						},
					},
					// Then toggle that cue
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
					text: 'Assign',
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
