import { StyleSheet } from 'react-native';

import sharedStyles from '~/views/Styles';
import { AUDIO_MIN_WIDTH, PLAY_BUTTON_SIZE, THUMB_SEEK_SIZE, WAVE_HEIGHT } from './constants';

const styles = StyleSheet.create({
	audioContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		minWidth: AUDIO_MIN_WIDTH,
		paddingVertical: 4
	},
	playPauseButton: {
		alignItems: 'center',
		marginLeft: 0,
		height: PLAY_BUTTON_SIZE,
		width: PLAY_BUTTON_SIZE,
		borderRadius: PLAY_BUTTON_SIZE / 2,
		justifyContent: 'center'
	},
	seekContainer: {
		flex: 1,
		// The waveform sits in the middle of the play button; time and speed hang below it
		paddingTop: (PLAY_BUTTON_SIZE - WAVE_HEIGHT) / 2,
		marginLeft: 8,
		marginRight: 8
	},
	seek: {
		height: WAVE_HEIGHT,
		justifyContent: 'center'
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
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	duration: {
		padding: 0,
		fontSize: 12,
		...sharedStyles.textRegular
	},
	thumbSeek: {
		height: THUMB_SEEK_SIZE,
		width: THUMB_SEEK_SIZE,
		borderRadius: THUMB_SEEK_SIZE / 2,
		position: 'absolute',
		top: (WAVE_HEIGHT - THUMB_SEEK_SIZE) / 2
	},
	containerPlaybackSpeed: {
		width: 34,
		height: 20,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden'
	},
	playbackSpeedText: {
		fontSize: 12,
		...sharedStyles.textBold
	}
});

export default styles;
