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
					presets: ['stop_all', 'play_next', 'no_play_mode', 'preview_mode', 'next_mode'],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	// === Core Presets ===

	presets['assign_and_toggle'] = {
		type: 'layered',
		name: 'Assign & Toggle',
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
		elements: [
			{
				type: 'box',
				id: 'bg',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				color: { isExpression: false, value: 0x000000 },
			},
			{
				type: 'box',
				id: 'ind_playing',
				x: { isExpression: false, value: 2 },
				y: { isExpression: false, value: 82 },
				width: { isExpression: false, value: 12 },
				height: { isExpression: false, value: 12 },
				color: {
					isExpression: true,
					value: "$(local:cue_id) != '' && $(liveplay:current_cue_uuid) == $(local:cue_id) ? 0x00ff00 : 0x000000",
				},
			},
			{
				type: 'box',
				id: 'ind_preview',
				x: { isExpression: false, value: 16 },
				y: { isExpression: false, value: 82 },
				width: { isExpression: false, value: 12 },
				height: { isExpression: false, value: 12 },
				color: {
					isExpression: true,
					value: "$(local:cue_id) != '' && $(liveplay:preview_item_uuid) == $(local:cue_id) ? 0x9933ff : 0x000000",
				},
			},
			{
				type: 'box',
				id: 'ind_next',
				x: { isExpression: false, value: 30 },
				y: { isExpression: false, value: 82 },
				width: { isExpression: false, value: 12 },
				height: { isExpression: false, value: 12 },
				color: {
					isExpression: true,
					value:
						"$(local:cue_id) != '' && (($(liveplay:next_item_uuid) == $(local:cue_id)) || ($(liveplay:next_item_uuid) == '' && $(liveplay:auto_next_item_uuid) == $(local:cue_id))) ? 0x00ccff : 0x000000",
				},
			},
			{
				type: 'text',
				id: 'label',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				text: { isExpression: true, value: '$(local:cue_name)' },
				color: { isExpression: false, value: 0xffffff },
				fontsize: { isExpression: false, value: 24 },
				halign: { isExpression: false, value: 'center' },
				valign: { isExpression: false, value: 'top' },
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
									options: { expression: "$(local:cue_id) != ''" },
								},
							],
							actions: [
								{
									actionId: 'internal:logicIf',
									options: {},
									children: {
										condition: [
											{
												feedbackId: 'internal:checkExpression',
												options: { expression: '$(liveplay:no_play_mode) == 1' },
											},
										],
										// No-play ON → reset button
										actions: [
											{ actionId: 'internal:localVariableSet', options: { name: 'cue_id', value: '' } },
											{ actionId: 'internal:localVariableSet', options: { name: 'cue_name', value: 'Assign' } },
										],
										elseActions: [
											{
												actionId: 'internal:logicIf',
												options: {},
												children: {
													condition: [
														{
															feedbackId: 'internal:checkExpression',
															options: { expression: '$(liveplay:preview_mode) == 1' },
														},
													],
													// Preview ON → toggle preview
													actions: [
														{
															actionId: 'toggle_cue_preview',
															options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
														},
													],
													elseActions: [
														{
															actionId: 'internal:logicIf',
															options: {},
															children: {
																condition: [
																	{
																		feedbackId: 'internal:checkExpression',
																		options: { expression: '$(liveplay:next_mode) == 1' },
																	},
																],
																// Next ON → set as next item
																actions: [
																	{
																		actionId: 'toggle_next_item',
																		options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
																	},
																],
																// Normal → toggle play/stop
																elseActions: [
																	{
																		actionId: 'toggle_cue',
																		options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
																	},
																],
															},
														},
													],
												},
											},
										],
									},
								},
							],
							elseActions: [
								{
									actionId: 'internal:localVariableSet',
									options: { name: 'cue_id', value: '$(liveplay:selected_item_uuid)' },
								},
								{
									actionId: 'internal:localVariableSet',
									options: { name: 'cue_name', value: '$(liveplay:selected_item_name)' },
								},
							],
						},
					},
				],
				up: [],
				1000: {
					options: { runWhileHeld: false },
					actions: [
						{ actionId: 'stop_cue', options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' } },
						{ actionId: 'internal:localVariableSet', options: { name: 'cue_id', value: '' } },
						{ actionId: 'internal:localVariableSet', options: { name: 'cue_name', value: 'Assign' } },
					],
				},
			},
		],
		feedbacks: [
			{
				feedbackId: 'cue_ready_to_assign',
				options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
				styleOverrides: [
					{
						elementId: 'label',
						elementProperty: 'text',
						override: { isExpression: false, value: 'Assign' },
					},
				],
			},
			{
				feedbackId: 'no_play_assigned',
				options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
				styleOverrides: [],
			},
			{
				feedbackId: 'preview_mode_assigned',
				options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
				styleOverrides: [],
			},
			{
				feedbackId: 'next_mode_assigned',
				options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
				styleOverrides: [],
			},
			{
				feedbackId: 'cue_is_playing',
				options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
				styleOverrides: [],
			},
			{
				feedbackId: 'cue_is_paused',
				options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
				styleOverrides: [],
			},
		],
	}

	presets['stop_all'] = {
		type: 'layered',
		name: 'Stop All',
		elements: [
			{
				type: 'box',
				id: 'bg',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				color: { isExpression: false, value: 0x333333 },
			},
			{
				type: 'text',
				id: 'label',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				text: { isExpression: false, value: '⏹' },
				color: { isExpression: false, value: 0xffffff },
				fontsize: { isExpression: false, value: 36 },
				halign: { isExpression: false, value: 'center' },
				valign: { isExpression: false, value: 'center' },
			},
		],
		steps: [{ down: [{ actionId: 'stop_all', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'any_cue_playing',
				options: {},
				styleOverrides: [
					{
						elementId: 'bg',
						elementProperty: 'color',
						override: { isExpression: false, value: 0xff0000 },
					},
				],
			},
		],
	}

	presets['no_play_mode'] = {
		type: 'layered',
		name: 'No-Play Mode',
		elements: [
			{
				type: 'box',
				id: 'bg',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				color: { isExpression: false, value: 0x333333 },
			},
			{
				type: 'text',
				id: 'label',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				text: { isExpression: false, value: 'Setup' },
				color: { isExpression: false, value: 0xffffff },
				fontsize: { isExpression: false, value: 36 },
				halign: { isExpression: false, value: 'center' },
				valign: { isExpression: false, value: 'center' },
			},
		],
		steps: [{ down: [{ actionId: 'toggle_no_play', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'no_play_active',
				options: {},
				styleOverrides: [
					{
						elementId: 'bg',
						elementProperty: 'color',
						override: { isExpression: false, value: 0xff8800 },
					},
					{
						elementId: 'label',
						elementProperty: 'color',
						override: { isExpression: false, value: 0x000000 },
					},
				],
			},
		],
	}

	presets['preview_mode'] = {
		type: 'layered',
		name: 'Preview Mode',
		elements: [
			{
				type: 'box',
				id: 'bg',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				color: { isExpression: false, value: 0x333333 },
			},
			{
				type: 'text',
				id: 'label',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				text: { isExpression: false, value: 'Preview' },
				color: { isExpression: false, value: 0xffffff },
				fontsize: { isExpression: false, value: 36 },
				halign: { isExpression: false, value: 'center' },
				valign: { isExpression: false, value: 'center' },
			},
		],
		steps: [{ down: [{ actionId: 'toggle_preview_mode', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'preview_mode_active',
				options: {},
				styleOverrides: [
					{
						elementId: 'bg',
						elementProperty: 'color',
						override: { isExpression: false, value: 0x9933ff },
					},
					{
						elementId: 'label',
						elementProperty: 'color',
						override: { isExpression: false, value: 0xffffff },
					},
				],
			},
		],
	}

	presets['next_mode'] = {
		type: 'layered',
		name: 'Next Mode',
		elements: [
			{
				type: 'box',
				id: 'bg',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				color: { isExpression: false, value: 0x333333 },
			},
			{
				type: 'text',
				id: 'label',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				text: { isExpression: false, value: 'Next' },
				color: { isExpression: false, value: 0xffffff },
				fontsize: { isExpression: false, value: 36 },
				halign: { isExpression: false, value: 'center' },
				valign: { isExpression: false, value: 'center' },
			},
		],
		steps: [{ down: [{ actionId: 'toggle_next_mode', options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'next_mode_active',
				options: {},
				styleOverrides: [
					{
						elementId: 'bg',
						elementProperty: 'color',
						override: { isExpression: false, value: 0x00ccff },
					},
					{
						elementId: 'label',
						elementProperty: 'color',
						override: { isExpression: false, value: 0x000000 },
					},
				],
			},
		],
	}

	presets['play_next'] = {
		type: 'layered',
		name: 'Play Next',
		elements: [
			{
				type: 'box',
				id: 'bg',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				color: { isExpression: false, value: 0x333333 },
			},
			{
				type: 'text',
				id: 'label',
				x: { isExpression: false, value: 0 },
				y: { isExpression: false, value: 0 },
				width: { isExpression: false, value: 100 },
				height: { isExpression: false, value: 100 },
				text: { isExpression: false, value: '▶' },
				color: { isExpression: false, value: 0xffffff },
				fontsize: { isExpression: false, value: 36 },
				halign: { isExpression: false, value: 'center' },
				valign: { isExpression: false, value: 'center' },
			},
		],
		steps: [
			{
				down: [
					{
						actionId: 'play_cue',
						options: { lookupMode: 'uuid', cueId: '$(liveplay:effective_next_item_uuid)' },
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'cue_is_next',
				options: { lookupMode: 'uuid', cueId: '$(liveplay:effective_next_item_uuid)' },
				styleOverrides: [
					{
						elementId: 'bg',
						elementProperty: 'color',
						override: { isExpression: false, value: 0x00ccff },
					},
					{
						elementId: 'label',
						elementProperty: 'color',
						override: { isExpression: false, value: 0x000000 },
					},
				],
			},
		],
	}

	self.setPresetDefinitions(structure, presets)
}
