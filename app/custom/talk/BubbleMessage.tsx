import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AUDIO_MIN_WIDTH } from '~/containers/AudioPlayer/constants';
import FullMessage from '~/containers/message/components/Message/FullMessage';
import MessageAccessibleIndex from '~/containers/message/components/MessageAccessibleIndex';
import { WidthAwareView } from '~/containers/message/components/WidthAwareView';
import { ContentLayout } from '~/containers/message/components/Layout/ContentLayout';
import Thread from '~/containers/message/components/Thread';
import Reactions from '~/containers/message/components/Reactions';
import Broadcast from '~/containers/message/components/Broadcast';
import BubbleMeta from './BubbleMeta';
import Avatar from '~/containers/Avatar';
import { SubscriptionType } from '~/definitions';
import { useMessageUser, useNavToRoomInfo } from '~/containers/message/stores/MessageRoomStore';
import {
	useBlocks,
	useIsEncrypted,
	useIsInfoMessage,
	useMessageText,
	useThreadData,
	useIsOwnMessage,
	useMessageAuthor,
	useMessageField,
	useMessageGrouping
} from '~/containers/message/stores/MessageStore';
import TextWithInlineTime from './TextWithInlineTime';
import { useTheme } from '~/theme';
import {
	BUBBLE_MAX_WIDTH,
	BUBBLE_PADDING_H,
	BUBBLE_RADIUS,
	BUBBLE_SHADOW,
	BUBBLE_TAIL_RADIUS,
	MEDIA_BOX,
	getTalkColors
} from './talkTheme';

const SPECIAL_LAYOUT_TYPES = ['jitsi_call_started', 'discussion-created'];

const AVATAR_SIZE = 32;
const AVATAR_MARGIN = 6;
const ROW_PADDING = 8;
const BUBBLE_MAX_RATIO = 0.84;

/**
 * Sender avatar next to the bubble of others' messages (Talk26 shows it in the first message of a group).
 * Grouped messages keep an empty slot so the bubbles stay aligned.
 */
const BubbleAvatar = () => {
	const user = useMessageUser();
	const navToRoomInfo = useNavToRoomInfo();
	const author = useMessageField(item => item.u);
	const isHeader = useMessageGrouping();

	if (!isHeader || !author) {
		return <View style={styles.avatarSlot} />;
	}

	return (
		<Pressable
			style={styles.avatarSlot}
			onPress={() => navToRoomInfo?.({ t: SubscriptionType.DIRECT, rid: author._id, itsMe: author._id === user?.id })}>
			<Avatar text={author.username} size={AVATAR_SIZE} borderRadius={AVATAR_SIZE / 2} />
		</Pressable>
	);
};

const Author = ({ color }: { color: string }) => {
	const { u: author } = useMessageAuthor();
	// Always the user's name; the username only when the message carries no name
	const name = author?.name || author?.username;
	return name ? (
		<Text numberOfLines={1} style={[styles.author, { color }]}>
			{name}
		</Text>
	) : null;
};

/** Plain text: the bubble shrinks to the text and the time sits inline (IOS/Talk26 TextWithInlineTime) */
const usePlainText = (hasAttachments: boolean) => {
	const urls = useMessageField(item => item.urls);
	const isEncrypted = useIsEncrypted();
	const isInfo = useIsInfoMessage();
	const { tmid } = useThreadData();
	const { messageText } = useMessageText();
	return { messageText, isPlainText: !!messageText && !isEncrypted && !isInfo && !tmid && !hasAttachments && !urls?.length };
};

/**
 * Talk26 look for a chat message: bubble aligned right (mine) / left (others), sender name inside the bubble for
 * others, time and status icons at the bottom right. Content, reactions and threads are upstream's components,
 * so attachments, markdown and E2E decryption keep working. Messages with a special layout (blocks, jitsi,
 * discussions, previews) fall back to upstream's.
 */
const BubbleMessage = ({ isPreview }: { isPreview?: boolean }) => {
	const { theme } = useTheme();
	const talk = getTalkColors(theme);
	const isOwn = useIsOwnMessage();
	const isHeader = useMessageGrouping();
	const id = useMessageField(item => item.id);
	const type = useMessageField(item => item.t);
	const { blocks } = useBlocks();
	const attachments = useMessageField(item => item.attachments);
	// Talk26: the bubble is as wide as its image/video box (WidthAwareView has no intrinsic width)
	const hasMedia = !!attachments?.some(file => file?.image_url || file?.video_url);
	// Same for the audio player, which is as wide as its waveform needs
	const hasAudio = !!attachments?.some(file => file?.audio_url);
	// The audio player shows the time on its own duration line
	const audioHasMeta = hasAudio && attachments?.length === 1;
	const { isPlainText, messageText } = usePlainText(!!attachments?.length);
	const { width: windowWidth } = useWindowDimensions();
	const bubbleMaxWidth = (windowWidth - ROW_PADDING * 2 - (isOwn ? 0 : AVATAR_SIZE + AVATAR_MARGIN)) * BUBBLE_MAX_RATIO;

	const meta = <BubbleMeta />;

	if (isPreview || blocks?.length || (type && SPECIAL_LAYOUT_TYPES.includes(type))) {
		return <FullMessage isPreview={isPreview} />;
	}

	return (
		<View testID={`message-${id}`} style={[styles.row, isOwn ? styles.rowMine : styles.rowOther]}>
			{!isOwn ? <BubbleAvatar /> : null}
			<MessageAccessibleIndex>
				<View
					style={[
						styles.bubble,
						BUBBLE_SHADOW,
						isPlainText && { maxWidth: bubbleMaxWidth, minWidth: undefined },
						// maxWidth is a % of the wrapper, which is itself sized by the bubble: it would shrink it to 84% of the box
						hasMedia && { width: MEDIA_BOX + BUBBLE_PADDING_H * 2, maxWidth: undefined },
						hasAudio && { width: AUDIO_MIN_WIDTH + BUBBLE_PADDING_H * 2, maxWidth: undefined },
						// Talk26 audio-only bubble: 4px above the player, which adds its own 6
						audioHasMeta && { paddingTop: 4 },
						isOwn
							? { backgroundColor: talk.bubbleSent, borderBottomRightRadius: BUBBLE_TAIL_RADIUS }
							: { backgroundColor: talk.bubbleReceived, borderBottomLeftRadius: BUBBLE_TAIL_RADIUS }
					]}>
					{!isOwn && isHeader ? <Author color={talk.bubbleAuthor} /> : null}
					{isPlainText && messageText ? (
						<View style={styles.content}>
							<TextWithInlineTime
								info={meta}
								text={messageText}
								maxContentWidth={Math.floor(bubbleMaxWidth - BUBBLE_PADDING_H * 2)}>
								<ContentLayout />
							</TextWithInlineTime>
							<Thread />
							<Reactions />
							<Broadcast />
						</View>
					) : (
						<>
							<WidthAwareView>
								<View style={styles.content}>
									<ContentLayout />
									<Thread />
									<Reactions />
									<Broadcast />
								</View>
							</WidthAwareView>
							{audioHasMeta ? null : <View style={styles.meta}>{meta}</View>}
						</>
					)}
				</View>
			</MessageAccessibleIndex>
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		width: '100%',
		flexDirection: 'row',
		paddingHorizontal: 8,
		paddingVertical: 3
	},
	rowMine: {
		justifyContent: 'flex-end'
	},
	rowOther: {
		justifyContent: 'flex-start',
		alignItems: 'flex-end'
	},
	avatarSlot: {
		width: AVATAR_SIZE,
		marginRight: 6,
		marginBottom: 2
	},
	bubble: {
		maxWidth: BUBBLE_MAX_WIDTH,
		flexShrink: 1,
		minWidth: 72,
		paddingHorizontal: BUBBLE_PADDING_H,
		paddingTop: 5,
		paddingBottom: 3,
		borderRadius: BUBBLE_RADIUS
	},
	author: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 2
	},
	content: {
		gap: 4
	},
	meta: {
		alignItems: 'flex-end',
		marginTop: 2
	}
});

export default memo(BubbleMessage);
