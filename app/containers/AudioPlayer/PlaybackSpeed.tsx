import { Text } from 'react-native';

import i18n from '~/i18n';
import styles from './styles';
import { AUDIO_PLAYBACK_SPEED, AVAILABLE_SPEEDS } from './constants';
import { getWaveColors } from './constants';
import { useUserPreferences } from '~/lib/methods/userPreferences';
import NativeButton from '../NativeButton';

const PlaybackSpeed = ({ isOwn = false }: { isOwn?: boolean }) => {
	const [playbackSpeed, setPlaybackSpeed] = useUserPreferences<number>(AUDIO_PLAYBACK_SPEED, AVAILABLE_SPEEDS[1]);

	const onPress = () => {
		const speedIndex = AVAILABLE_SPEEDS.indexOf(playbackSpeed as number);
		const nextSpeedIndex = speedIndex + 1 >= AVAILABLE_SPEEDS.length ? 0 : speedIndex + 1;
		setPlaybackSpeed(AVAILABLE_SPEEDS[nextSpeedIndex]);
	};

	return (
		<NativeButton
			testID='playback-speed'
			accessible
			accessibilityLabel={i18n.t('Playback_speed', { playbackSpeed: `${playbackSpeed} x` })}
			onPress={onPress}
			style={[styles.containerPlaybackSpeed, { backgroundColor: getWaveColors(isOwn).speedBg }]}>
			<Text style={[styles.playbackSpeedText, { color: getWaveColors(isOwn).speedText }]}>{playbackSpeed}x</Text>
		</NativeButton>
	);
};

export default PlaybackSpeed;
