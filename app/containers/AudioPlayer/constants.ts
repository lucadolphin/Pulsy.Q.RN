export const AVAILABLE_SPEEDS = [0.5, 1, 1.5, 2];

export const AUDIO_BUTTON_HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };

export const SEEK_HIT_SLOP = { top: 12, right: 8, bottom: 12, left: 8 };

export const THUMB_SEEK_SIZE = 10;

export const WAVE_HEIGHT = 28;

export const PLAY_BUTTON_SIZE = 28;

// The message bubble wraps its content, so the waveform needs the player to be wide enough on its own
export const AUDIO_MIN_WIDTH = 248;

export const AUDIO_PLAYBACK_SPEED = 'audioPlaybackSpeed';

export const DEFAULT_TIME_LABEL = '0:00';

export const ACTIVE_OFFSET_X = 0.001;

// IOS/Talk26 AudioMessageV2 (mapColors.messageAudio*)
export const SEEK_THUMB_COLOR = '#2aa3ef';
export const PLAY_ICON_SIZE = 26;
export const SPEED_PILL = { width: 30, height: 22 };

export const getWaveColors = (isOwn: boolean) =>
	isOwn
		? { played: '#ffffff', unplayed: 'rgba(255, 255, 255, 0.45)', speedBg: 'rgba(0, 0, 0, 0.18)', speedText: '#ffffff' }
		: { played: '#4a5c66', unplayed: '#c5cdd2', speedBg: 'rgba(0, 0, 0, 0.08)', speedText: '#4a5c66' };
