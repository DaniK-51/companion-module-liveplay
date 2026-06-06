import type ModuleInstance from './main.js'

export type VariablesSchema = {
	player_state: string
	player_position: number
	player_position_formatted: string
	player_duration: number
	player_duration_formatted: string
	player_progress: number
	master_volume: number
	current_cue_title: string
	current_cue_artist: string
	current_cue_id: string
	current_cue_uuid: string
	current_cue_position: number
	current_cue_volume: number
	project_name: string
	project_cue_count: number
	project_group_count: number
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		player_state: { name: 'Player State' },
		player_position: { name: 'Player Position (seconds)' },
		player_position_formatted: { name: 'Player Position (MM:SS)' },
		player_duration: { name: 'Player Duration (seconds)' },
		player_duration_formatted: { name: 'Player Duration (MM:SS)' },
		player_progress: { name: 'Player Progress (%)' },
		master_volume: { name: 'Master Volume' },
		current_cue_title: { name: 'Current Cue Title' },
		current_cue_artist: { name: 'Current Cue Artist' },
		current_cue_id: { name: 'Current Cue ID' },
		current_cue_uuid: { name: 'Current Cue UUID' },
		current_cue_position: { name: 'Current Cue Position (seconds)' },
		current_cue_volume: { name: 'Current Cue Volume (dB)' },
		project_name: { name: 'Project Name' },
		project_cue_count: { name: 'Project Cue Count' },
		project_group_count: { name: 'Project Group Count' },
	})
}

export function UpdateVariables(self: ModuleInstance): void {
	const state = self.currentPlayerState
	
	// Format time as MM:SS
	const formatTime = (seconds: number): string => {
		if (!isFinite(seconds) || seconds < 0) return '00:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}

	self.setVariableValues({
		player_state: state.state,
		player_position: state.position,
		player_position_formatted: formatTime(state.position),
		player_duration: state.duration,
		player_duration_formatted: formatTime(state.duration),
		player_progress: state.progress,
		master_volume: state.masterVolume,
		current_cue_title: '', // Will be populated when we have cue data
		current_cue_artist: '', // Will be populated when we have cue data
		current_cue_id: '', // Will be populated when we have cue data
		current_cue_uuid: state.currentCue || '',
		current_cue_position: state.position,
		current_cue_volume: 0, // Will be populated when we have cue data
		project_name: '', // Will be populated when we have project data
		project_cue_count: 0, // Will be populated when we have project data
		project_group_count: 0, // Will be populated when we have project data
	})
}
