import { type ReactElement } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { CustomIcon } from '../CustomIcon';
import { useTheme } from '~/theme';
import styles from './styles';
import RCActivityIndicator from '../ActivityIndicator';
import { AUDIO_BUTTON_HIT_SLOP, PLAY_ICON_SIZE } from './constants';
import { type TAudioState } from './types';
import NativeButton from '../NativeButton';
import getPlayButtonAccessibilityLabel from './getPlayButtonAccessibilityLabel';
import { getTalkColors } from '~/custom/talk/talkTheme';

interface IButton {
	disabled?: boolean;
	onPress: () => void;
	audioState: TAudioState;
}

const Icon = ({ audioState, disabled }: { audioState: TAudioState; disabled: boolean }) => {
	const { theme, colors } = useTheme();
	const talk = getTalkColors(theme);

	if (audioState === 'loading') {
		return <RCActivityIndicator size={24} color={talk.primary} />;
	}

	const color = disabled ? colors.buttonBackgroundPrimaryDisabled : talk.primary;
	if (audioState === 'playing' || audioState === 'paused') {
		return <Ionicons name={audioState === 'playing' ? 'pause' : 'play'} size={PLAY_ICON_SIZE} color={color} />;
	}

	return <CustomIcon name='arrow-down' size={24} color={color} />;
};

const PlayButton = ({ onPress, disabled = false, audioState }: IButton): ReactElement => {
	return (
		<NativeButton
			testID='play-button'
			accessible
			accessibilityLabel={getPlayButtonAccessibilityLabel(audioState)}
			style={styles.playPauseButton}
			disabled={disabled}
			onPress={onPress}
			hitSlop={AUDIO_BUTTON_HIT_SLOP}>
			<Icon audioState={audioState} disabled={disabled} />
		</NativeButton>
	);
};

export default PlayButton;
