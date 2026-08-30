import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

// === Helpers ===

const FULL = { isExpression: false as const, value: 100 }
const ZERO = { isExpression: false as const, value: 0 }
const CENTER = { isExpression: false as const, value: 'center' as const }

function bgBox(color: number) {
	return {
		type: 'box' as const,
		id: 'bg',
		x: ZERO,
		y: ZERO,
		width: FULL,
		height: FULL,
		color: { isExpression: false as const, value: color },
	}
}

function label(text: string, opts?: { expr?: boolean; fontsize?: number; valign?: string; color?: number }) {
	return {
		type: 'text' as const,
		id: 'label',
		x: ZERO,
		y: ZERO,
		width: FULL,
		height: FULL,
		text: opts?.expr ? { isExpression: true as const, value: text } : { isExpression: false as const, value: text },
		color: { isExpression: false as const, value: opts?.color ?? 0xffffff },
		fontsize: { isExpression: false as const, value: opts?.fontsize ?? 36 },
		halign: CENTER,
		valign: { isExpression: false as const, value: (opts?.valign ?? 'center') as 'center' | 'top' },
	}
}

function indicator(id: string, x: number, expr: string) {
	return {
		type: 'box' as const,
		id,
		x: { isExpression: false as const, value: x },
		y: { isExpression: false as const, value: 82 },
		width: { isExpression: false as const, value: 12 },
		height: { isExpression: false as const, value: 12 },
		color: { isExpression: true as const, value: expr },
	}
}

function overrideBg(color: number) {
	return { elementId: 'bg', elementProperty: 'color', override: { isExpression: false as const, value: color } }
}

function overrideLabelColor(color: number) {
	return { elementId: 'label', elementProperty: 'color', override: { isExpression: false as const, value: color } }
}

function overrideLabelText(text: string) {
	return { elementId: 'label', elementProperty: 'text', override: { isExpression: false as const, value: text } }
}

function transportPreset(
	name: string,
	text: string,
	actionId: 'toggle_no_play' | 'toggle_preview_mode' | 'toggle_next_mode' | 'stop_all',
	feedbackId: string,
	activeColor: number,
	labelColor = 0x000000,
) {
	return {
		type: 'layered' as const,
		name,
		elements: [bgBox(0x333333), label(text)],
		steps: [{ down: [{ actionId, options: {} }], up: [] }],
		feedbacks: [
			{
				feedbackId,
				options: {},
				styleOverrides: [overrideBg(activeColor), overrideLabelColor(labelColor)],
			},
		],
	}
}

function cueFeedback(feedbackId: string) {
	return { feedbackId, options: { lookupMode: 'uuid' as const, cueId: '$(local:cue_id)' }, styleOverrides: [] }
}

// === Presets ===

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

	// === Assign & Toggle ===

	presets['assign_and_toggle'] = {
		type: 'layered',
		name: 'Assign & Toggle',
		localVariables: [
			{ variableName: 'cue_id', variableType: 'simple', startupValue: '' },
			{ variableName: 'cue_name', variableType: 'simple', startupValue: 'Assign' },
		],
		elements: [
			bgBox(0x000000),
			indicator(
				'ind_playing',
				2,
				"$(local:cue_id) != '' && $(liveplay:current_cue_uuid) == $(local:cue_id) ? 0x00ff00 : 0x000000",
			),
			indicator(
				'ind_preview',
				16,
				"$(local:cue_id) != '' && $(liveplay:preview_item_uuid) == $(local:cue_id) ? 0x9933ff : 0x000000",
			),
			indicator(
				'ind_next',
				30,
				"$(local:cue_id) != '' && (($(liveplay:next_item_uuid) == $(local:cue_id)) || ($(liveplay:next_item_uuid) == '' && $(liveplay:auto_next_item_uuid) == $(local:cue_id))) ? 0x00ccff : 0x000000",
			),
			label('$(local:cue_name)', { expr: true, fontsize: 24, valign: 'top' }),
		],
		steps: [
			{
				down: [
					{
						actionId: 'internal:logicIf',
						options: {},
						children: {
							condition: [{ feedbackId: 'internal:checkExpression', options: { expression: "$(local:cue_id) != ''" } }],
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
																actions: [
																	{
																		actionId: 'toggle_next_item',
																		options: { lookupMode: 'uuid', cueId: '$(local:cue_id)' },
																	},
																],
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
				styleOverrides: [overrideLabelText('Assign')],
			},
			cueFeedback('no_play_assigned'),
			cueFeedback('preview_mode_assigned'),
			cueFeedback('next_mode_assigned'),
			cueFeedback('cue_is_playing'),
			cueFeedback('cue_is_paused'),
		],
	}

	// === Transport Presets ===

	presets['stop_all'] = {
		...transportPreset('Stop All', '⏹', 'stop_all', 'any_cue_playing', 0xff0000, 0xffffff),
		feedbacks: [
			{
				feedbackId: 'any_cue_playing',
				options: {},
				styleOverrides: [overrideBg(0xff0000)],
			},
		],
	}

	presets['play_next'] = {
		type: 'layered',
		name: 'Play Next',
		elements: [bgBox(0x333333), label('▶')],
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
				styleOverrides: [overrideBg(0x00ccff), overrideLabelColor(0x000000)],
			},
		],
	}

	presets['no_play_mode'] = transportPreset('No-Play Mode', 'Setup', 'toggle_no_play', 'no_play_active', 0xff8800)
	presets['preview_mode'] = transportPreset(
		'Preview Mode',
		'Preview',
		'toggle_preview_mode',
		'preview_mode_active',
		0x9933ff,
	)
	presets['next_mode'] = transportPreset('Next Mode', 'Next', 'toggle_next_mode', 'next_mode_active', 0x00ccff)

	self.setPresetDefinitions(structure, presets)
}
