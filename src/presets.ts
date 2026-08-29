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
					presets: ['stop_all', 'no_play_mode'],
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
							// Is button assigned?
							condition: [
								{
									feedbackId: 'internal:checkExpression',
									options: {
										expression: "$(local:cue_id) != ''",
									},
								},
							],
							// YES - button is assigned
							actions: [
								{
									actionId: 'internal:logicIf',
									options: {},
									children: {
										// Check no-play mode
										condition: [
											{
												feedbackId: 'internal:checkExpression',
												options: {
													expression: '$(liveplay:no_play_mode) == 1',
												},
											},
										],
										// No-play ON → reset button
										actions: [
											{
												actionId: 'internal:localVariableSet',
												options: { name: 'cue_id', value: '' },
											},
											{
												actionId: 'internal:localVariableSet',
												options: { name: 'cue_name', value: 'Assign' },
											},
										],
										// No-play OFF → toggle playback
										elseActions: [
											{
												actionId: 'toggle_cue',
												options: {
													lookupMode: 'uuid',
													cueId: '$(local:cue_id)',
												},
											},
										],
									},
								},
							],
							// NO - button not assigned → capture selected
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
				// Long press (1s) → always reset
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
							options: { name: 'cue_id', value: '' },
						},
						{
							actionId: 'internal:localVariableSet',
							options: { name: 'cue_name', value: 'Assign' },
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
				feedbackId: 'no_play_assigned',
				options: {
					lookupMode: 'uuid',
					cueId: '$(local:cue_id)',
				},
				style: {
					bgcolor: 0x0066ff,
					color: 0xffffff,
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

	// Preset 3: No-Play Mode Toggle
	presets['no_play_mode'] = {
		type: 'simple',
		name: 'No-Play Mode',
		style: {
			text: 'Setup',
			size: '18',
			color: 0xffffff,
			bgcolor: 0x333333,
		},
		steps: [
			{
				down: [
					{
						actionId: 'toggle_no_play',
						options: {},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'no_play_active',
				options: {},
				style: {
					bgcolor: 0xff8800,
					color: 0x000000,
					text: 'SETUP',
				},
			},
		],
	}

	self.setPresetDefinitions(structure, presets)
}
