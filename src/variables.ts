import type ModuleInstance from './main.js'

export type VariablesSchema = {
	player_state: string
	player_position: number
	player_position_formatted: string
	player_progress: number
	master_gain: number
	active_cue_count: number
	current_cue_id: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		player_state: { name: 'Player State' },
		player_position: { name: 'Player Position (seconds)' },
		player_position_formatted: { name: 'Player Position (MM:SS)' },
		player_progress: { name: 'Player Progress (%)' },
		master_gain: { name: 'Master Gain (dB)' },
		active_cue_count: { name: 'Active Cue Count' },
		current_cue_id: { name: 'Current Cue ID' },
	})
}

export function UpdateVariables(self: ModuleInstance): void {
	const formatTime = (seconds: number): string => {
		if (!isFinite(seconds) || seconds < 0) return '00:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}

	const state = self.currentPlayerState
	self.setVariableValues({
		player_state: state.state,
		player_position: state.position,
		player_position_formatted: formatTime(state.position),
		player_progress: state.progress,
		master_gain: state.masterGain,
		active_cue_count: state.activeCueCount,
		current_cue_id: state.currentCueId,
	})
}
