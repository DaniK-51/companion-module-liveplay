// ============================================================================
// LivePlay Module — Project & Engine State Types
// ============================================================================

// --- Project Document Types (from GET /api/project) ---

export interface EndBehavior {
	action: 'nothing' | 'next' | 'goto-item' | 'goto-index' | 'loop'
	targetUuid?: string
	targetIndex?: number[]
}

export interface StartBehavior {
	action: 'nothing' | 'play-next' | 'play-item' | 'play-index'
	targetUuid?: string
	targetIndex?: number[]
}

export interface GroupStartBehavior {
	action: 'play-first' | 'play-all'
}

export interface DuckingBehavior {
	mode: 'stop-all' | 'no-ducking' | 'duck-others'
	duckLevel?: number
	duckFadeIn?: number
	duckFadeOut?: number
}

export interface CustomAction {
	timePoint: number
	action: CustomActionType
}

export type CustomActionType =
	| { type: 'play-item'; uuid: string }
	| { type: 'play-index'; index: number[] }
	| { type: 'stop-all' }
	| { type: 'http-request'; request: HttpRequest }

export interface HttpRequest {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	url: string
	contentType: 'form' | 'json'
	body?: Record<string, unknown>
}

export interface CartSlotKeyBinding {
	key: string
	ctrlKey: boolean
	shiftKey: boolean
	altKey: boolean
}

export interface ProjectSettings {
	defaultOutputDevice?: string | null
	previewDevice?: string | null
	ltcDevice?: string | null
	outputTarget?: string
	outputTargetLevels?: Record<string, unknown>
	meterMode?: string
	defaultTransitionMode?: string
	autoCueNextWithoutEndBehavior?: boolean
	stopAllFadeMs?: number
	uiScrollToPlaying?: boolean
	disableAutoVolumeAndTrim?: boolean
	disableLimiter?: boolean
	disableSilenceWarning?: boolean
	autoSave?: boolean
	indexDisplayStart?: number
}

export interface Theme {
	mode: 'light' | 'dark'
	accentColor: string
}

export interface CartItem {
	slot: number
	itemUuid: string
	index: number[]
}

// --- Project Item (unified for audio and group) ---

export interface ProjectItem {
	uuid: string
	index: number[]
	displayName: string
	color: string
	type: 'audio' | 'group'

	// Audio-specific
	mediaFileName?: string
	mediaPath?: string
	mediaServerPath?: string
	inPoint?: number
	outPoint?: number
	volume?: number
	duration?: number
	fadeOutDuration?: number
	playFade?: number
	stopFade?: number
	crossFade?: number
	endBehavior?: EndBehavior
	startBehavior?: StartBehavior
	duckingBehavior?: DuckingBehavior
	customActions?: CustomAction[]
	startNextEnabled?: boolean
	startNextTime?: number
	startNextFadeOut?: boolean
	ltcEnabled?: boolean
	ltcStartTimecode?: string
	ltcFrameRate?: number

	// Group-specific
	children?: ProjectItem[]
	isExpanded?: boolean

	// Runtime: link to engine cue (populated after GET /api/cues)
	cueId?: string
}

// --- Engine Cue (from GET /api/cues) ---

export interface EngineCue {
	id: string
	displayName: string
	filePath: string
	artist: string
	title: string
	durationSec: number
	gainDb: number
	fadeInMs: number
	fadeOutMs: number
	sourceChannels: number
	fileLoaded: boolean

	// Runtime: link to project item
	itemUuid?: string
}

// --- Mixer (from GET /api/mixers) ---

export interface MixerInfo {
	id: string
	displayName: string
	gainDb: number
	muted: boolean
	soloed: boolean
}

// --- Device (from GET /api/devices) ---

export interface DeviceInfo {
	id: string
	displayName: string
	channelCount: number
	sampleRate: number
	isDefault: boolean
}

// --- Meter Types (from WebSocket meters frame) ---

export interface MeterChannel {
	peak_db: number
	rms_db: number
}

export interface MeterItem {
	cue_id: string
	transport: number
	playhead_seconds: number
	sources: MeterChannel[]
}

export interface MixerMeter {
	mixer_id: string
	peak_db: number
	rms_db: number
}

export interface MasterMeter {
	index: number
	peak_db: number
	rms_db: number
	gain_reduction_db: number
}

// --- Transport State ---

export enum TransportState {
	Stopped = 0,
	Playing = 1,
	FadingOut = 2,
	Paused = 3,
}

// --- WebSocket Message Types ---

export interface CueStateMessage {
	type: 'cue_state'
	cue_id: string
	transport: TransportState
	playhead_seconds: number
	item_uuid?: string
}

export interface PlaybackSnapshotMessage {
	type: 'playback_snapshot'
	cues: Array<{
		cue_id: string
		transport: TransportState
		playhead_seconds: number
		item_uuid?: string
	}>
	next_item_uuid?: string
	master_gain_db: number
	output_channel_gains?: Array<{ channel: number; db: number }>
	preview?: { item_uuid: string; cue_id: string }
}

export interface MeterMessage {
	type: 'meters'
	items: MeterItem[]
	mixer_channels: MixerMeter[]
	master_channels: MasterMeter[]
}

export interface DocPatchMessage {
	type: 'doc_patch'
	op: string
	[key: string]: unknown
}

export interface PongMessage {
	type: 'pong'
}

export interface ErrorMessage {
	type: 'error'
	message: string
}

export type ServerMessage =
	| CueStateMessage
	| PlaybackSnapshotMessage
	| MeterMessage
	| DocPatchMessage
	| PongMessage
	| ErrorMessage

// --- Client → Server Frames ---

export interface PlayFrame {
	type: 'play'
	item_uuid?: string
	cue_id?: string
}

export interface StopFrame {
	type: 'stop'
	item_uuid?: string
	cue_id?: string
}

export interface PauseFrame {
	type: 'pause'
	item_uuid?: string
	cue_id?: string
}

export interface ResumeFrame {
	type: 'resume'
	item_uuid?: string
	cue_id?: string
}

export interface SeekFrame {
	type: 'seek'
	item_uuid?: string
	cue_id?: string
	seconds: number
}

export interface GainFrame {
	type: 'gain'
	item_uuid?: string
	cue_id?: string
	db: number
}

export interface FadeFrame {
	type: 'fade'
	item_uuid?: string
	cue_id?: string
	in_ms: number
	out_ms: number
}

export interface StopAllFrame {
	type: 'stop_all'
	fade_ms?: number
}

export interface SetNextItemFrame {
	type: 'set_next_item'
	item_uuid?: string
}

export interface PingFrame {
	type: 'ping'
}

export type ClientFrame =
	| PlayFrame
	| StopFrame
	| PauseFrame
	| ResumeFrame
	| SeekFrame
	| GainFrame
	| FadeFrame
	| StopAllFrame
	| SetNextItemFrame
	| PingFrame

// --- REST API Response Types ---

export interface LivePlayHealthResponse {
	ok: boolean
	name: string
}

export interface LivePlayProjectHeader {
	name: string
	itemCount: number
	theme?: Theme
	settings?: ProjectSettings
	cart?: CartItem[]
	hasOpenProject?: boolean
}

export interface LivePlayProject {
	name: string
	version: string
	folderPath: string
	items: ProjectItem[]
	cartItems: CartItem[]
	cartOnlyItems: ProjectItem[]
	theme: Theme
	settings?: ProjectSettings
	createdAt: string
	lastModified: string
}

export interface LivePlayCue {
	id: string
	display_name: string
	file_path: string
	artist: string
	title: string
	duration_sec: number
	gain_db: number
	fade_in_ms: number
	fade_out_ms: number
	ltc?: {
		enabled: boolean
		fps: number
		offset_ns: number
		start_timecode: string
	}
	transport?: number
	playhead_seconds?: number
	source_channels: number
	file_loaded: boolean
}

export interface LivePlayMixer {
	id: string
	display_name: string
	gain_db: number
	muted: boolean
	soloed: boolean
}

export interface LivePlayDevice {
	id: string
	display_name: string
	channel_count: number
	sample_rate: number
	is_default: boolean
}
