import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Avatar from '~/containers/Avatar';
import { CustomIcon } from '~/containers/CustomIcon';
import LastMessage from '~/containers/RoomItem/LastMessage';
import Touchable from '~/containers/RoomItem/Touchable';
import { type IRoomItemProps } from '~/containers/RoomItem/interfaces';
import I18n from '~/i18n';
import { DisplayMode } from '~/lib/constants/constantDisplayMode';
import useStatusAccessibilityLabel from '~/lib/hooks/useStatusAccessibilityLabel';
import { formatLastMessage } from '~/lib/methods/formatLastMessage';
import { useTheme } from '~/theme';
import { getTalkColors } from './talkTheme';
import { formatTalkDate } from './talkDate';

// Sizes and look of IOS/Talk26/app/Screens/Rooms/RoomRow.tsx and RoomRowParts/styles.ts
const AVATAR_SIZE = 55;
const BADGE_SIZE = 18;
const STATUS_COLORS: Record<string, string> = { online: '#4caf50', away: '#ffc107', busy: '#f3565d' };
const GROUP_TYPES = ['c', 'p', 'l'];

export const getUnreadInfo = ({
	unread,
	tunread,
	alert,
	hideUnreadStatus
}: {
	unread: number;
	tunread?: string[];
	alert?: boolean;
	hideUnreadStatus?: boolean;
}) => {
	const count = unread > 0 ? unread : tunread?.length || 0;
	return {
		hasUnread: !hideUnreadStatus && (count > 0 || !!alert),
		count,
		label: count > 99 ? '99+' : `${count}`
	};
};

type TAttachmentIcon = 'image' | 'video' | 'mic' | 'attach';

const MEDIA_KINDS = [
	{ prefix: 'audio', url: 'audio_url', icon: 'mic', fallback: 'Audio', useCaption: false },
	{ prefix: 'image', url: 'image_url', icon: 'image', fallback: 'Image', useCaption: true },
	{ prefix: 'video', url: 'video_url', icon: 'video', fallback: 'Video', useCaption: true }
] as const;

/** Talk26 `RoomRowMessagePreview`: a last message with a file shows an icon and what it is, not "X sent an attachment" */
export const getAttachmentPreview = (
	lastMessage: IRoomItemProps['lastMessage']
): { icon: TAttachmentIcon; label: string } | null => {
	const attachment = lastMessage?.attachments?.[0];
	const file = (lastMessage as { file?: { name?: string; type?: string } } | undefined)?.file;
	if (!attachment && !file) return null;
	const mime = `${attachment?.type || file?.type || ''}`;
	const caption = lastMessage?.msg?.trim();
	const kind = MEDIA_KINDS.find(({ prefix, url }) => attachment?.[url] || mime.startsWith(prefix));
	if (kind) return { icon: kind.icon, label: (kind.useCaption && caption) || I18n.t(kind.fallback) };
	const name = attachment?.title?.replace(/^File Uploaded: /, '') || file?.name;
	return { icon: 'attach', label: name || caption || I18n.t('Files') };
};

const AttachmentPreview = ({ icon, label, color }: { icon: TAttachmentIcon; label: string; color: string }) => (
	<View style={styles.attachmentPreview}>
		<CustomIcon name={icon} size={16} color={color} />
		<Text numberOfLines={1} style={[styles.attachmentText, { color }]}>
			{label}
		</Text>
	</View>
);

const RoomAvatar = ({
	avatar,
	type,
	rid,
	isGroup,
	status,
	favorite,
	talk
}: {
	avatar: string;
	type: IRoomItemProps['type'];
	rid: string;
	isGroup: boolean;
	status: string;
	favorite?: boolean;
	talk: ReturnType<typeof getTalkColors>;
}) => {
	const statusColor = isGroup ? undefined : STATUS_COLORS[status];
	return (
		<AvatarBubble group={isGroup} color={talk.bubbleReceived}>
			<Avatar text={avatar} size={AVATAR_SIZE - 2} type={type} rid={rid} borderRadius={(AVATAR_SIZE - 2) / 2} />
			{statusColor ? (
				<View style={[styles.statusDot, { backgroundColor: statusColor, borderColor: talk.chatBackground }]} />
			) : null}
			{favorite ? (
				<View style={styles.favorite}>
					<Text style={[styles.favoriteStar, { color: talk.primary }]}>★</Text>
				</View>
			) : null}
		</AvatarBubble>
	);
};

const AvatarBubble = ({ children, group, color }: { children: React.ReactNode; group: boolean; color: string }) => (
	<View style={[styles.bubble, styles.bubbleShadow, group && { backgroundColor: color }]}>
		{/* The pointer goes first: later siblings draw above, and the picture must stay over the speech bubble's tail */}
		{group ? <View testID='room-item-bubble-pointer' style={[styles.bubblePointer, { borderRightColor: color }]} /> : null}
		{children}
	</View>
);

const UnreadPill = ({ label, color }: { label: string; color: string }) => (
	<View style={styles.badgeOuter}>
		<View style={[styles.badge, { backgroundColor: color }, label.length >= 2 && styles.badgeWide]}>
			<Text allowFontScaling={false} style={styles.badgeText}>
				{label}
			</Text>
		</View>
	</View>
);

/**
 * Talk26 look for a rooms list row: round avatar with shadow ("speech bubble" for groups), online dot, bold name,
 * time on the right (primary color when there's something unread), two lines preview and an unread pill.
 * Same props as upstream's RoomItem (drop-in replacement): swipe actions and taps still come from upstream's Touchable.
 */
const RoomItem = ({
	rid,
	userId,
	type,
	prid,
	name,
	avatar,
	width,
	username,
	showLastMessage,
	status = 'offline',
	useRealName,
	isFocused,
	isGroupChat,
	isRead,
	date,
	favorite,
	lastMessage,
	isTyping,
	typingUsers,
	alert,
	hideUnreadStatus,
	unread,
	tunread,
	testID,
	swipeEnabled = true,
	onPress,
	onLongPress,
	teamMain,
	displayMode,
	accessibilityDate
}: IRoomItemProps) => {
	const { theme, colors } = useTheme();
	const talk = getTalkColors(theme);
	const attachmentPreview = isTyping ? null : getAttachmentPreview(lastMessage);
	// Same date as Talk26: of the last message, not upstream's read-aware one
	const dateText = formatTalkDate(lastMessage?.ts, I18n.t('Yesterday')) || date;

	const memoizedMessage = useMemo(
		() => formatLastMessage({ lastMessage, username, useRealName, showLastMessage, alert, type }),
		[lastMessage, username, useRealName, showLastMessage, alert, type]
	);
	const statusAccessibilityLabel = useStatusAccessibilityLabel({
		isGroupChat,
		status,
		prid,
		teamMain,
		type,
		userId,
		roomUserId: userId
	});
	const accessibilityLabel = `${name}. ${statusAccessibilityLabel}. ${accessibilityDate}. ${memoizedMessage}`;

	const { hasUnread, count, label } = getUnreadInfo({ unread, tunread, alert, hideUnreadStatus });
	const isGroup = GROUP_TYPES.includes(type) || !!isGroupChat;

	return (
		<Touchable
			onPress={onPress}
			onLongPress={onLongPress}
			width={width}
			favorite={favorite}
			isRead={isRead}
			rid={rid}
			testID={testID}
			type={type}
			isFocused={!!isFocused}
			swipeEnabled={swipeEnabled}
			displayMode={displayMode}>
			<View
				style={[styles.row, { backgroundColor: talk.chatBackground }]}
				accessible
				accessibilityRole='button'
				accessibilityLabel={accessibilityLabel}
				accessibilityHint={I18n.t('Long_press_for_more_actions')}>
				<RoomAvatar avatar={avatar} type={type} rid={rid} isGroup={isGroup} status={status} favorite={favorite} talk={talk} />
				<View style={styles.content}>
					<View style={styles.titleRow}>
						<Text numberOfLines={1} style={[styles.title, { color: talk.bubbleText }]}>
							{name}
						</Text>
						<Text numberOfLines={1} style={[styles.date, { color: hasUnread ? talk.primary : talk.bubbleTime }]}>
							{dateText}
						</Text>
					</View>
					{showLastMessage && displayMode !== DisplayMode.Condensed ? (
						<View style={styles.messageRow}>
							<View style={styles.message}>
								{attachmentPreview ? (
									<AttachmentPreview
										{...attachmentPreview}
										color={alert && !hideUnreadStatus ? colors.fontDefault : colors.fontSecondaryInfo}
									/>
								) : (
									<LastMessage
										isTyping={isTyping}
										typingUsers={typingUsers}
										lastMessage={lastMessage}
										type={type}
										showLastMessage={showLastMessage}
										username={username || ''}
										alert={alert && !hideUnreadStatus}
										useRealName={useRealName}
									/>
								)}
							</View>
							{hasUnread && count > 0 ? <UnreadPill label={label} color={talk.primary} /> : null}
						</View>
					) : null}
				</View>
			</View>
		</Touchable>
	);
};

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 16
	},
	bubble: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center'
	},
	bubbleShadow: {
		shadowColor: 'rgba(0, 0, 0, 0.5)',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.22,
		shadowRadius: 2.22,
		elevation: 3
	},
	bubblePointer: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		borderTopWidth: 10,
		borderTopColor: 'transparent',
		borderRightWidth: 10,
		borderBottomWidth: 10,
		borderBottomColor: 'transparent',
		transform: [{ rotate: '-30deg' }]
	},
	statusDot: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 2
	},
	favorite: {
		position: 'absolute',
		left: -1,
		bottom: -1,
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 3,
		shadowColor: 'rgba(0, 0, 0, 0.35)',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.35,
		shadowRadius: 1.5
	},
	favoriteStar: {
		fontSize: 11,
		lineHeight: 14
	},
	content: {
		flex: 1,
		marginLeft: 16,
		justifyContent: 'center'
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	title: {
		flex: 1,
		flexShrink: 1,
		paddingRight: 4,
		fontSize: 17,
		fontWeight: '700'
	},
	date: {
		flexShrink: 0,
		fontSize: 12
	},
	messageRow: {
		flexDirection: 'row',
		alignItems: 'flex-start'
	},
	message: {
		flex: 1
	},
	attachmentPreview: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	attachmentText: {
		flexShrink: 1,
		fontSize: 14
	},
	badgeOuter: {
		flexShrink: 0,
		marginLeft: 6,
		alignItems: 'center',
		justifyContent: 'center'
	},
	badge: {
		minWidth: BADGE_SIZE,
		height: BADGE_SIZE,
		paddingHorizontal: 4,
		borderRadius: BADGE_SIZE / 2,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden'
	},
	badgeWide: {
		minWidth: 22,
		paddingHorizontal: 5
	},
	badgeText: {
		color: '#ffffff',
		fontSize: 10,
		fontWeight: '700',
		textAlign: 'center',
		includeFontPadding: false
	}
});

export default memo(RoomItem);
