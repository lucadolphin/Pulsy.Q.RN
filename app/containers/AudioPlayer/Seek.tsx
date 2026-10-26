import { type ReactNode, useMemo, useState } from 'react';
import { type LayoutChangeEvent, View, TextInput, type TextInputProps, TouchableNativeFeedback } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	type SharedValue,
	useAnimatedProps,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import styles from './styles';
import { useTheme } from '~/theme';
import { SEEK_HIT_SLOP, THUMB_SEEK_SIZE, ACTIVE_OFFSET_X, DEFAULT_TIME_LABEL } from './constants';
import { fallbackBarHeights } from './waveform';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface ISeek {
	duration: SharedValue<number>;
	currentTime: SharedValue<number>;
	loaded: boolean;
	onChangeTime: (time: number) => void;
	// Heights of the waveform bars; without them the same pattern is drawn every time
	barHeights?: number[];
	// Shown under the waveform, on the right of the time
	trailing?: ReactNode;
}

const Bars = ({ heights, color }: { heights: number[]; color: string }) => (
	<View style={styles.waveBars} pointerEvents='none'>
		{heights.map((height, index) => (
			<View key={index} style={styles.waveBarSlot}>
				<View style={[styles.waveBar, { height, backgroundColor: color }]} />
			</View>
		))}
	</View>
);

function clamp(value: number, min: number, max: number) {
	'worklet';

	return Math.min(Math.max(value, min), max);
}

// https://docs.swmansion.com/react-native-reanimated/docs/2.x/fundamentals/worklets/
const formatTime = (ms: number) => {
	'worklet';

	const minutes = Math.floor(ms / 60);
	const remainingSeconds = Math.floor(ms % 60);
	const formattedMinutes = String(minutes).padStart(2, '0');
	const formattedSeconds = String(remainingSeconds).padStart(2, '0');
	return `${formattedMinutes}:${formattedSeconds}`;
};

const Seek = ({ currentTime, duration, loaded = false, onChangeTime, barHeights, trailing }: ISeek) => {
	const { colors } = useTheme();
	const [trackWidth, setTrackWidth] = useState(0);
	const heights = useMemo(() => barHeights ?? fallbackBarHeights('audio'), [barHeights]);

	const maxWidth = useSharedValue(1);
	const translateX = useSharedValue(0);
	const timeLabel = useSharedValue(DEFAULT_TIME_LABEL);
	const scale = useSharedValue(1);
	const isPanning = useSharedValue(false);
	const contextX = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedCurrentTime = useSharedValue(0);

	const styleLine = useAnimatedStyle(() => ({
		width: translateX.value
	}));

	const styleThumb = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value - THUMB_SEEK_SIZE / 2 }, { scale: scale.value }]
	}));

	const onLayout = (event: LayoutChangeEvent) => {
		const { width } = event.nativeEvent.layout;
		maxWidth.value = width;
		setTrackWidth(width);
	};

	const panGesture = Gesture.Pan()
		.enabled(loaded)
		.activeOffsetX([-ACTIVE_OFFSET_X, ACTIVE_OFFSET_X])
		.onStart(() => {
			isPanning.value = true;
			contextX.value = translateX.value;
			savedTranslateX.value = translateX.value;
			savedCurrentTime.value = currentTime.value;
			scale.value = withTiming(1.3, { duration: 150 });
		})
		.onUpdate(event => {
			const newX = contextX.value + event.translationX;
			translateX.value = clamp(newX, 0, maxWidth.value);
		})
		.onFinalize((_, didSucceed) => {
			if (!isPanning.value) return;
			isPanning.value = false;
			scale.value = withTiming(1, { duration: 150 });
			if (didSucceed) {
				scheduleOnRN(onChangeTime, currentTime.value);
			} else {
				translateX.value = savedTranslateX.value;
				currentTime.value = savedCurrentTime.value;
			}
		});

	useDerivedValue(() => {
		if (isPanning.value) {
			// When the user is panning, always the currentTime.value is been set different from the currentTime provided by
			// the audio in progress
			currentTime.value = (translateX.value * duration.value) / maxWidth.value || 0;
		} else {
			translateX.value = (currentTime.value * maxWidth.value) / duration.value || 0;
		}
		timeLabel.value = formatTime(currentTime.value);
	}, [translateX, maxWidth, duration, isPanning, currentTime]);

	const timeLabelAnimatedProps = useAnimatedProps(() => {
		if (currentTime.value !== 0) {
			return {
				text: timeLabel.value
			} as TextInputProps;
		}
		return {
			text: formatTime(duration.value)
		} as TextInputProps;
	}, [timeLabel, duration, currentTime]);

	const thumbColor = loaded ? colors.buttonBackgroundPrimaryDefault : colors.buttonBackgroundPrimaryDisabled;

	// TouchableNativeFeedback is avoiding do a long press message when seeking the audio
	return (
		<TouchableNativeFeedback>
			<View style={styles.seekContainer}>
				<View style={styles.seek} onLayout={onLayout}>
					<Bars heights={heights} color={colors.strokeMedium} />
					<Animated.View style={[styles.wavePlayed, styleLine]} pointerEvents='none'>
						<View style={{ width: trackWidth }}>
							<Bars heights={heights} color={colors.buttonBackgroundPrimaryDefault} />
						</View>
					</Animated.View>
					<GestureDetector gesture={panGesture}>
						<Animated.View hitSlop={SEEK_HIT_SLOP} style={[styles.thumbSeek, { backgroundColor: thumbColor }, styleThumb]} />
					</GestureDetector>
				</View>
				<View style={styles.footer}>
					<AnimatedTextInput
						defaultValue={DEFAULT_TIME_LABEL}
						editable={false}
						style={[styles.duration, { color: colors.fontSecondaryInfo }]}
						animatedProps={timeLabelAnimatedProps}
					/>
					{trailing}
				</View>
			</View>
		</TouchableNativeFeedback>
	);
};

export default Seek;
