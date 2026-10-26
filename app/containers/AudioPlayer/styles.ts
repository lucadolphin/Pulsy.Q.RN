import { StyleSheet } from 'react-native';

import sharedStyles from '~/views/Styles';
import { AUDIO_MIN_WIDTH, PLAY_BUTTON_SIZE, THUMB_SEEK_SIZE, WAVE_HEIGHT, SPEED_PILL } from './constants';

const styles = StyleSheet.create({
	audioContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		minWidth: AUDIO_MIN_WIDTH,
		paddingTop: 6
	},
	// Just the triangle, no circle behind it
	playPauseButton: {
		alignItems: 'center',
		marginLeft: 0,
		height: PLAY_BUTTON_SIZE,
		width: PLAY_BUTTON_SIZE,
		justifyContent: 'center'
	},
	seekContainer: {
		flex: 1,
		marginLeft: 4
	},
	seekRow: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	seek: {
		flex: 1,
		height: WAVE_HEIGHT,
		justifyContent: 'center',
		marginRight: 8
	},
	waveBars: {
		flexDirection: 'row',
		alignItems: 'center',
		height: WAVE_HEIGHT,
		width: '100%'
	},
	waveBarSlot: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		height: WAVE_HEIGHT
	},
	waveBar: {
		width: 2.8,
		borderRadius: 3
	},
	wavePlayed: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 0,
		overflow: 'hidden'
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	duration: {
		padding: 0,
		fontSize: 10,
		minWidth: 36,
		marginTop: -2,
		marginRight: 'auto',
		fontVariant: ['tabular-nums'],
		...sharedStyles.textRegular
	},
	meta: {
		paddingRight: 2,
		flexShrink: 1,
		flex: 1,
		alignItems: 'flex-end'
	},
	thumbSeek: {
		height: THUMB_SEEK_SIZE,
		width: THUMB_SEEK_SIZE,
		borderRadius: THUMB_SEEK_SIZE / 2,
		position: 'absolute',
		top: (WAVE_HEIGHT - THUMB_SEEK_SIZE) / 2
	},
	containerPlaybackSpeed: {
		width: SPEED_PILL.width,
		height: SPEED_PILL.height,
		borderRadius: SPEED_PILL.height / 2,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
		flexShrink: 0
	},
	playbackSpeedText: {
		fontSize: 10,
		...sharedStyles.textBold
	}
});

export default styles;
