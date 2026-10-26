import { type ReactElement, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { type IUserMessage } from '~/definitions';
import { type IAttachment } from '~/definitions/IAttachment';
import I18n from '~/i18n';
import { isIOS } from '~/lib/methods/helpers';
import { fileDownload } from '~/lib/methods/helpers/fileDownload';
import EventEmitter from '~/lib/methods/helpers/events';
import { useTheme } from '~/theme';
import sharedStyles from '~/views/Styles';
import { type TIconsName } from '~/containers/CustomIcon';
import { LISTENER } from '~/containers/Toast';
import Markdown from '~/containers/markdown';
import MessageActionTouchable from '../Touchable/MessageActionTouchable';
import { useMediaAutoDownload } from '~/containers/message/hooks/useMediaAutoDownload';
import { useMessageUser } from '~/containers/message/stores/MessageRoomStore';
import BlurComponent from '../OverlayComponent';
import { type TDownloadState } from '~/lib/methods/handleMediaDownload';
import messageStyles from '~/containers/message/styles';

const SUPPORTED_TYPES = ['video/quicktime', 'video/mp4', ...(isIOS ? [] : ['video/3gp', 'video/mkv'])];
const isTypeSupported = (type: string) => SUPPORTED_TYPES.indexOf(type) !== -1;

// uri of the video -> uri of its first frame, or null when there is none
const previews = new Map<string, string | null>();

/** First frame of the video, to show it in the bubble instead of an empty placeholder */
const useVideoPreview = (source?: string): string | null => {
	const [preview, setPreview] = useState<string | null>(source ? (previews.get(source) ?? null) : null);

	useEffect(() => {
		if (!source) {
			setPreview(null);
			return;
		}
		if (previews.has(source)) {
			setPreview(previews.get(source) ?? null);
			return;
		}
		let active = true;
		(async () => {
			try {
				const { getThumbnailAsync } = require('expo-video-thumbnails');
				const { uri } = await getThumbnailAsync(source, { time: 0 });
				previews.set(source, uri);
				if (active) {
					setPreview(uri);
				}
			} catch {
				// No preview: the placeholder stays
			}
		})();
		return () => {
			active = false;
		};
	}, [source]);

	return preview;
};

const styles = StyleSheet.create({
	preview: StyleSheet.absoluteFillObject,
	cancelContainer: {
		position: 'absolute',
		top: 8,
		right: 8
	},
	text: {
		...sharedStyles.textRegular,
		fontSize: 12
	}
});

interface IMessageVideo {
	file: IAttachment;
	showAttachment?: (file: IAttachment) => void;
	author?: IUserMessage;
	msg?: string;
}

const CancelIndicator = () => {
	const { colors } = useTheme();
	return (
		<View style={styles.cancelContainer}>
			<Text style={[styles.text, { color: colors.fontSecondaryInfo }]}>{I18n.t('Cancel')}</Text>
		</View>
	);
};

const Thumbnail = ({
	status,
	encrypted = false,
	preview
}: {
	status: TDownloadState;
	encrypted: boolean;
	preview: string | null;
}) => {
	const { colors } = useTheme();
	let icon: TIconsName = status === 'downloaded' ? 'play-filled' : 'arrow-down-circle';
	if (encrypted && status === 'downloaded') {
		icon = 'encrypted';
	}

	return (
		<>
			{preview && !encrypted ? <Image source={{ uri: preview }} style={styles.preview} contentFit='cover' /> : null}
			<BlurComponent
				iconName={icon}
				loading={status === 'loading'}
				showBackground={!preview || encrypted}
				style={[messageStyles.image, { borderColor: colors.strokeLight, borderWidth: 1 }]}
			/>
			{status === 'loading' ? <CancelIndicator /> : null}
		</>
	);
};

const Video = ({ file, showAttachment, author, msg }: IMessageVideo): ReactElement | null => {
	const user = useMessageUser();
	const { status, onPress, url, isEncrypted, currentFile } = useMediaAutoDownload({ file, author, showAttachment });
	const preview = useVideoPreview(isEncrypted ? undefined : status === 'downloaded' ? currentFile.title_link : url);

	const _onPress = async () => {
		if (currentFile.video_type && !isTypeSupported(currentFile.video_type)) {
			if (isIOS) {
				EventEmitter.emit(LISTENER, { message: I18n.t('Unsupported_format') });
			} else {
				await downloadVideoToGallery(url);
			}
			return;
		}
		onPress();
	};

	const downloadVideoToGallery = async (uri: string) => {
		try {
			const fileDownloaded = await fileDownload(uri, file);
			if (fileDownloaded) {
				EventEmitter.emit(LISTENER, { message: I18n.t('saved_to_gallery') });
			}
		} catch (error) {
			EventEmitter.emit(LISTENER, { message: I18n.t('error-save-video') });
		}
	};

	return (
		<View style={{ gap: 4 }}>
			{msg ? <Markdown msg={msg} username={user?.username} /> : null}
			<MessageActionTouchable onPress={_onPress} style={messageStyles.image}>
				<Thumbnail status={status} encrypted={isEncrypted} preview={preview} />
			</MessageActionTouchable>
		</View>
	);
};

export default Video;
