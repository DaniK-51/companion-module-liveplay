import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection[] = [
		{
			id: 'quick_actions',
			name: 'Quick Actions',
			definitions: [
				{
					id: 'cue_controls',
					name: 'Cue Controls',
					description: 'Assign and control individual cues',
					type: 'simple',
					presets: ['assign_and_toggle'],
				},
				{
					id: 'transport_controls',
					name: 'Transport',
					description: 'Global transport controls',
					type: 'simple',
					presets: ['stop_all'],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	// Preset 1: Assign & Toggle
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
								{
									actionId: 'toggle_cue',
									options: {
										lookupMode: 'uuid',
										cueId: '$(local:cue_id)',
									},
								},
							],
							elseActions: [
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
				// Long press (1s) → reset to unassigned
				1000: {
					options: { runWhileHeld: false },
					actions: [
						{
							actionId: 'stop_cue',
							options: {
								lookupMode: 'uuid',
								cueId: '$(local:cue_id)',
							},
						},
						{
							actionId: 'internal:localVariableSet',
							options: {
								name: 'cue_id',
								value: '',
							},
						},
						{
							actionId: 'internal:localVariableSet',
							options: {
								name: 'cue_name',
								value: 'Assign',
							},
						},
					],
				},
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

	// Preset 2: Stop All
	presets['stop_all'] = {
		type: 'simple',
		name: 'Stop All',
		style: {
			text: '⏹',
			size: '44',
			color: 0xffffff,
			bgcolor: 0xff0000,
		},
		steps: [
			{
				down: [
					{
						actionId: 'stop_all',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'any_cue_playing',
				options: {},
				style: {
					bgcolor: 0xff0000,
					color: 0xffffff,
				},
			},
		],
	}

	self.setPresetDefinitions(structure, presets)
}
