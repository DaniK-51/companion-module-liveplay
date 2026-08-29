import type ModuleInstance from './main.js'

export type VariablesSchema = {
	player_state: string
	player_position: number
	player_position_formatted: string
	player_progress: number
	master_gain: number
	active_cue_count: number
	current_cue_id: string
	current_cue_uuid: string
	current_cue_name: string
	current_cue_artist: string
	current_cue_title: string
	current_cue_duration: number
	current_cue_duration_formatted: string
	next_item_uuid: string
	selected_item_uuid: string
	selected_item_name: string
	master_peak_db: number
	master_rms_db: number
	master_gain_reduction_db: number
	mixer_peak_db: number
	mixer_rms_db: number
	project_name: string
	project_item_count: number
	preview_item_uuid: string
	preview_item_name: string
	next_item_name: string
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
		current_cue_uuid: { name: 'Current Cue UUID' },
		current_cue_name: { name: 'Current Cue Name' },
		current_cue_artist: { name: 'Current Cue Artist' },
		current_cue_title: { name: 'Current Cue Title' },
		current_cue_duration: { name: 'Current Cue Duration (seconds)' },
		current_cue_duration_formatted: { name: 'Current Cue Duration (MM:SS)' },
		next_item_uuid: { name: 'Next Item UUID' },
		selected_item_uuid: { name: 'Selected Item UUID' },
		selected_item_name: { name: 'Selected Item Name' },
		master_peak_db: { name: 'Master Peak (dB)' },
		master_rms_db: { name: 'Master RMS (dB)' },
		master_gain_reduction_db: { name: 'Master Gain Reduction (dB)' },
		mixer_peak_db: { name: 'Mixer Peak (dB)' },
		mixer_rms_db: { name: 'Mixer RMS (dB)' },
		project_name: { name: 'Project Name' },
		project_item_count: { name: 'Project Item Count' },
		preview_item_uuid: { name: 'Preview Item UUID' },
		preview_item_name: { name: 'Preview Item Name' },
		next_item_name: { name: 'Next Item Name' },
	})
}

export function UpdateVariables(self: ModuleInstance): void {
	const formatTime = (seconds: number): string => {
		if (!isFinite(seconds) || seconds < 0) return '00:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}

	const s = self.state
	const playerState = s.currentPlayerState

	// Get current cue metadata
	const currentCueId = playerState.currentCueId
	const currentUuid = currentCueId ? (s.cueIdToUuid.get(currentCueId) ?? '') : ''
	const currentCue = currentCueId ? s.engineCues.get(currentCueId) : undefined
	const currentItem = currentUuid ? s.projectItems.get(currentUuid) : undefined

	const currentCueName = currentItem?.displayName ?? currentCue?.displayName ?? ''
	const currentCueArtist = currentCue?.artist ?? ''
	const currentCueTitle = currentCue?.title ?? ''
	const currentCueDuration = currentCue?.durationSec ?? currentItem?.duration ?? 0

	// Get master meter values (default to channel 0)
	const masterMeter = s.masterMeters.get(0)
	const masterPeakDb = masterMeter?.peakDb ?? -Infinity
	const masterRmsDb = masterMeter?.rmsDb ?? -Infinity
	const masterGainReductionDb = masterMeter?.gainReductionDb ?? 0

	// Get first mixer meter values
	let mixerPeakDb = -Infinity
	let mixerRmsDb = -Infinity
	const firstMixer = s.mixerMeters.values().next().value
	if (firstMixer) {
		mixerPeakDb = firstMixer.peakDb
		mixerRmsDb = firstMixer.rmsDb
	}

	self.setVariableValues({
		player_state: playerState.state,
		player_position: playerState.position,
		player_position_formatted: formatTime(playerState.position),
		player_progress: playerState.progress,
		master_gain: playerState.masterGain,
		active_cue_count: playerState.activeCueCount,
		current_cue_id: currentCueId,
		current_cue_uuid: currentUuid,
		current_cue_name: currentCueName,
		current_cue_artist: currentCueArtist,
		current_cue_title: currentCueTitle,
		current_cue_duration: currentCueDuration,
		current_cue_duration_formatted: formatTime(currentCueDuration),
		next_item_uuid: s.nextItemUuid ?? '',
		selected_item_uuid: s.selectedItemUuid ?? '',
		selected_item_name: s.selectedItemUuid ? (s.projectItems.get(s.selectedItemUuid)?.displayName ?? '') : '',
		master_peak_db: masterPeakDb,
		master_rms_db: masterRmsDb,
		master_gain_reduction_db: masterGainReductionDb,
		mixer_peak_db: mixerPeakDb,
		mixer_rms_db: mixerRmsDb,
		project_name: s.projectName,
		project_item_count: s.projectItems.size,
		preview_item_uuid: s.previewItemUuid ?? '',
		preview_item_name: s.previewItemUuid ? (s.projectItems.get(s.previewItemUuid)?.displayName ?? '') : '',
		next_item_name: s.nextItemUuid ? (s.projectItems.get(s.nextItemUuid)?.displayName ?? '') : '',
	})
}
