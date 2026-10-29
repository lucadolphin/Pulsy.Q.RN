import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import I18n from '~/i18n';
import { CustomIcon } from '~/containers/CustomIcon';
import { ImageViewer } from '~/containers/ImageViewer';
import { COLORS } from './ui';

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: '#000000' },
	bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 12 },
	name: { flex: 1, color: COLORS.white, fontSize: 16, fontWeight: '600' },
	button: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff26'
	},
	body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	video: { width: '100%', height: '100%' }
});

const Video = ({ uri }: { uri: string }) => {
	const player = useVideoPlayer(uri, instance => {
		instance.play();
	});
	return <VideoView player={player} style={styles.video} nativeControls contentFit='contain' />;
};

/** A full-screen look at an image (pinch to zoom) or a video of the card, with download and close. */
export const AttachmentPreview = ({
	name,
	uri,
	kind,
	onDownload,
	onClose
}: {
	name: string;
	uri: string;
	kind: 'image' | 'video';
	onDownload: () => void;
	onClose: () => void;
}) => {
	const { top } = useSafeAreaInsets();
	const { width, height } = useWindowDimensions();
	const [loading, setLoading] = useState(kind === 'image');
	useEffect(() => setLoading(kind === 'image'), [kind, uri]);

	return (
		<Modal animationType='fade' onRequestClose={onClose}>
			<GestureHandlerRootView style={styles.root}>
				<View style={[styles.bar, { paddingTop: top + 8 }]}>
					<TouchableOpacity
						onPress={onClose}
						style={styles.button}
						accessibilityLabel={I18n.t('Close')}
						accessibilityRole='button'>
						<CustomIcon name='close' size={20} color={COLORS.white} />
					</TouchableOpacity>
					<Text style={styles.name} numberOfLines={1}>
						{name}
					</Text>
					<TouchableOpacity
						onPress={onDownload}
						style={styles.button}
						accessibilityLabel={I18n.t('Exentriq_Card_Download')}
						accessibilityRole='button'>
						<CustomIcon name='download' size={20} color={COLORS.white} />
					</TouchableOpacity>
				</View>
				<View style={styles.body}>
					{kind === 'image' ? (
						<ImageViewer uri={uri} width={width} height={height - top - 60} onLoadEnd={() => setLoading(false)} />
					) : (
						<Video uri={uri} />
					)}
					{loading ? <ActivityIndicator color={COLORS.white} style={StyleSheet.absoluteFill} /> : null}
				</View>
			</GestureHandlerRootView>
		</Modal>
	);
};
