import { type MutableRefObject, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAudioRecorderState, type AudioRecorder } from 'expo-audio';

import { useTheme } from '~/theme';
import { liveBarHeights, normalizeMetering } from '~/containers/AudioPlayer/waveform';

const SAMPLE_INTERVAL = 100;

export const LiveWaveform = ({
	audioRecorder,
	samplesRef
}: {
	audioRecorder: AudioRecorder;
	samplesRef: MutableRefObject<number[]>;
}) => {
	const { colors } = useTheme();
	const { isRecording, durationMillis, metering } = useAudioRecorderState(audioRecorder, SAMPLE_INTERVAL);

	useEffect(() => {
		if (isRecording) samplesRef.current.push(normalizeMetering(metering));
	}, [durationMillis]);

	const heights = useMemo(() => liveBarHeights(samplesRef.current), [durationMillis]);

	return (
		<View style={styles.track}>
			{heights.map((height, index) => (
				<View key={index} style={styles.slot}>
					<View style={[styles.bar, { height, backgroundColor: colors.buttonBackgroundPrimaryDefault }]} />
				</View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	track: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		height: 28,
		marginLeft: 16
	},
	slot: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	bar: {
		width: 2.5,
		borderRadius: 2
	}
});
