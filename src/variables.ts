import type ModuleInstance from './main.js'

export type VariablesSchema = {
	player_state: string
	player_position: number
	player_position_formatted: string
	player_progress: number
	master_gain: number
	active_cue_count: number
	current_cue_id: string
	master_peak_db: number
	master_rms_db: number
	master_gain_reduction_db: number
	mixer_peak_db: number
	mixer_rms_db: number
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
		master_peak_db: { name: 'Master Peak (dB)' },
		master_rms_db: { name: 'Master RMS (dB)' },
		master_gain_reduction_db: { name: 'Master Gain Reduction (dB)' },
		mixer_peak_db: { name: 'Mixer Peak (dB)' },
		mixer_rms_db: { name: 'Mixer RMS (dB)' },
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
		master_peak_db: self.masterPeakDb,
		master_rms_db: self.masterRmsDb,
		master_gain_reduction_db: self.masterGainReductionDb,
		mixer_peak_db: self.mixerPeakDb,
		mixer_rms_db: self.mixerRmsDb,
	})
}
