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

	// Preset 2: Assign & Toggle (assign on first press, toggle after)
	presets['assign_and_toggle'] = {
		type: 'simple',
		name: 'Assign & Toggle',
		style: {
			text: '$(local:cue_name)',
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
			{
				variableName: 'cue_name',
				variableType: 'simple',
				startupValue: 'Assign',
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'internal:logicIf',
						options: {},
						children: {
							condition: [
								{
									feedbackId: 'internal:checkExpression',
									options: {
										expression: "$(local:cue_id) != ''",
									},
								},
							],
							actions: [
								// Already assigned → toggle play/stop
								{
									actionId: 'toggle_cue',
									options: {
										lookupMode: 'uuid',
										cueId: '$(local:cue_id)',
									},
								},
							],
							elseActions: [
								// Not assigned → capture selected UUID and name
								{
									actionId: 'internal:localVariableSet',
									options: {
										name: 'cue_id',
										value: '$(liveplay:selected_item_uuid)',
									},
								},
								{
									actionId: 'internal:localVariableSet',
									options: {
										name: 'cue_name',
										value: '$(liveplay:selected_item_name)',
									},
								},
							],
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
