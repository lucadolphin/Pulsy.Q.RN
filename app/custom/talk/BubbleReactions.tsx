import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useActionSheet } from '~/containers/ActionSheet';
import Emoji from '~/containers/message/components/Emoji';
import { useMessageId, useReactions } from '~/containers/message/stores/MessageStore';
import { useMessageUser, useOnReactionPress } from '~/containers/message/stores/MessageRoomStore';
import I18n from '~/i18n';
import { useTheme } from '~/theme';
import { getTalkColors } from './talkTheme';

interface IReaction {
	_id: string;
	emoji: string;
	usernames: string[];
}

type TUserReactions = { username: string; emojis: string[] };

// One row per user with the emojis they reacted with (IOS/Talk26 ReactionsV2)
const groupByUser = (reactions: IReaction[], me?: string): TUserReactions[] => {
	const rows = new Map<string, string[]>();
	reactions.forEach(({ emoji, usernames }) =>
		usernames.forEach(username => rows.set(username, [...(rows.get(username) ?? []), emoji]))
	);
	return [...rows.entries()]
		.map(([username, emojis]) => ({ username, emojis }))
		.sort((a, b) => Number(b.username === me) - Number(a.username === me));
};

// The action sheet is mounted outside of the message's stores, so what it needs from them comes as props
const ReactionsSheet = ({
	reactions,
	messageId,
	username,
	onReactionPress
}: {
	reactions: IReaction[];
	messageId: string;
	username?: string;
	onReactionPress?: (emoji: string, messageId: string) => void;
}) => {
	const { theme, colors } = useTheme();
	const talk = getTalkColors(theme);
	const { hideActionSheet } = useActionSheet();
	const rows = groupByUser(reactions, username);

	return (
		<View style={styles.sheet}>
			<Text style={[styles.sheetTitle, { color: colors.fontTitlesLabels }]}>{I18n.t('Reactions')}</Text>
			<ScrollView style={styles.sheetScroll}>
				{rows.map(({ username: name, emojis }) => {
					const isMine = name === username;
					return (
						<View key={name} style={[styles.userRow, { borderBottomColor: colors.strokeLight }]}>
							<Text
								numberOfLines={1}
								style={[styles.username, { color: isMine ? talk.primary : colors.fontDefault }, isMine && styles.usernameMine]}>
								{isMine ? I18n.t('You') : name}
							</Text>
							<View style={styles.userEmojis}>
								{emojis.map(emoji => (
									<View key={emoji} style={[styles.reactionItem, isMine && { backgroundColor: talk.primaryLight }]}>
										<Emoji content={emoji} standardEmojiStyle={styles.sheetEmoji} customEmojiStyle={styles.sheetCustomEmoji} />
										{isMine ? (
											<Pressable
												hitSlop={8}
												accessibilityLabel={I18n.t('Remove')}
												onPress={() => {
													onReactionPress?.(emoji, messageId);
													hideActionSheet();
												}}>
												<Ionicons name='close-circle' size={20} color={colors.fontSecondaryInfo} />
											</Pressable>
										) : null}
									</View>
								))}
							</View>
						</View>
					);
				})}
			</ScrollView>
		</View>
	);
};

/**
 * Talk26 look for the reactions of a bubble: a small pill with the emojis (and the count above one) over the bottom
 * edge. Tapping it opens the list of who reacted with what.
 */
const BubbleReactions = ({ isOwn }: { isOwn: boolean }) => {
	const { theme } = useTheme();
	const talk = getTalkColors(theme);
	const reactions = useReactions() as IReaction[] | undefined;
	const messageId = useMessageId();
	const user = useMessageUser();
	const onReactionPress = useOnReactionPress();
	const { showActionSheet } = useActionSheet();

	if (!Array.isArray(reactions) || reactions.length === 0) {
		return null;
	}

	return (
		<Pressable
			testID='message-reactions'
			accessibilityRole='button'
			accessibilityLabel={I18n.t('Reactions')}
			onPress={() =>
				showActionSheet({
					children: (
						<ReactionsSheet
							reactions={reactions}
							messageId={messageId}
							username={user?.username}
							onReactionPress={onReactionPress}
						/>
					)
				})
			}
			style={[styles.chip, isOwn ? styles.chipMine : styles.chipOther, { backgroundColor: talk.bubbleReceived }]}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipInner}>
				{reactions.map(reaction => (
					<View key={reaction.emoji} style={styles.chipReaction}>
						<Emoji content={reaction.emoji} standardEmojiStyle={styles.emoji} customEmojiStyle={styles.customEmoji} />
						{reaction.usernames.length > 1 ? (
							<Text style={[styles.count, { color: talk.bubbleTime }]}>
								{reaction.usernames.length > 9 ? '9+' : reaction.usernames.length}
							</Text>
						) : null}
					</View>
				))}
			</ScrollView>
		</Pressable>
	);
};

/** The chip hangs this far under the bubble, which the row leaves free */
export const REACTIONS_OVERHANG = 20;

const styles = StyleSheet.create({
	chip: {
		position: 'absolute',
		bottom: -REACTIONS_OVERHANG,
		maxWidth: 280,
		borderRadius: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: 'rgba(0, 0, 0, 0.08)',
		shadowColor: 'rgba(0, 0, 0, 0.12)',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 1,
		shadowRadius: 4,
		elevation: 4,
		paddingHorizontal: 6,
		paddingVertical: 2
	},
	chipMine: {
		right: 10
	},
	chipOther: {
		left: 10
	},
	chipInner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 1
	},
	chipReaction: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		paddingHorizontal: 2,
		flexShrink: 0
	},
	emoji: {
		fontSize: 16
	},
	customEmoji: {
		width: 16,
		height: 16
	},
	count: {
		fontSize: 12
	},
	sheet: {
		paddingHorizontal: 16,
		paddingBottom: 16
	},
	sheetTitle: {
		textAlign: 'center',
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 12
	},
	sheetScroll: {
		maxHeight: 280
	},
	userRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	username: {
		flex: 1,
		marginRight: 8,
		fontSize: 16
	},
	usernameMine: {
		fontWeight: '600'
	},
	userEmojis: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-end',
		gap: 6,
		flexShrink: 1
	},
	reactionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 2,
		paddingHorizontal: 6,
		borderRadius: 12
	},
	sheetEmoji: {
		fontSize: 22
	},
	sheetCustomEmoji: {
		width: 22,
		height: 22
	}
});

export default BubbleReactions;
