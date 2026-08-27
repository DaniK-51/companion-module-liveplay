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
	project_name: string
	project_item_count: number
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
		project_name: { name: 'Project Name' },
		project_item_count: { name: 'Project Item Count' },
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

	// Get master meter values (default to channel 0)
	const masterMeter = self.masterMeters.get(0)
	const masterPeakDb = masterMeter?.peakDb ?? -Infinity
	const masterRmsDb = masterMeter?.rmsDb ?? -Infinity
	const masterGainReductionDb = masterMeter?.gainReductionDb ?? 0

	// Get first mixer meter values
	let mixerPeakDb = -Infinity
	let mixerRmsDb = -Infinity
	const firstMixer = self.mixerMeters.values().next().value
	if (firstMixer) {
		mixerPeakDb = firstMixer.peakDb
		mixerRmsDb = firstMixer.rmsDb
	}

	self.setVariableValues({
		player_state: state.state,
		player_position: state.position,
		player_position_formatted: formatTime(state.position),
		player_progress: state.progress,
		master_gain: state.masterGain,
		active_cue_count: state.activeCueCount,
		current_cue_id: state.currentCueId,
		master_peak_db: masterPeakDb,
		master_rms_db: masterRmsDb,
		master_gain_reduction_db: masterGainReductionDb,
		mixer_peak_db: mixerPeakDb,
		mixer_rms_db: mixerRmsDb,
		project_name: self.projectName,
		project_item_count: self.projectItems.size,
	})
}
