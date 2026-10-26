import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type MessageTypesValues, SubscriptionType } from '~/definitions';
import { useTheme } from '~/theme';
import sharedStyles from '~/views/Styles';
import RightIcons from './RightIcons';
import { messageHaveAuthorName } from '../utils';
import MessageTime from './Time';
import { useResponsiveLayout } from '~/lib/hooks/useResponsiveLayout/useResponsiveLayout';
import { useIsOwnMessage, useMessageAuthor, useMessageGrouping, useMessageHeaderMeta } from '../stores/MessageStore';
import { useNavToRoomInfo } from '../stores/MessageRoomStore';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	username: {
		flexShrink: 1,
		fontSize: 16,
		lineHeight: 22,
		...sharedStyles.textSemibold
	},
	usernameInfoMessage: {
		fontSize: 16,
		...sharedStyles.textMedium
	},
	titleContainer: {
		flexShrink: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	}
});

const User = () => {
	const navToRoomInfo = useNavToRoomInfo();
	const { colors } = useTheme();
	const { isLargeFontScale } = useResponsiveLayout();
	const isHeader = useMessageGrouping();
	const { u: author, alias } = useMessageAuthor();
	const { t: type } = useMessageHeaderMeta();
	const itsMe = useIsOwnMessage();

	if (isHeader) {
		// The bubble always shows the user's name; the username is only a fallback for messages that carry no name
		const username = author?.name || author?.username;

		const onUserPress = () => {
			navToRoomInfo?.({
				t: SubscriptionType.DIRECT,
				rid: author?._id || '',
				itsMe
			});
		};

		const textContent = <>{alias || username}</>;

		if (messageHaveAuthorName(type as MessageTypesValues)) {
			return (
				<Text style={[styles.usernameInfoMessage, { color: colors.fontTitlesLabels }]} onPress={onUserPress}>
					{textContent}
				</Text>
			);
		}

		return (
			<View style={styles.container}>
				<Pressable testID={`username-header-${username}`} style={styles.titleContainer} onPress={onUserPress}>
					<Text style={[styles.username, { color: colors.fontTitlesLabels }]} numberOfLines={1}>
						{textContent}
					</Text>
					{isLargeFontScale ? null : <MessageTime />}
				</Pressable>
				<RightIcons />
			</View>
		);
	}
	return null;
};

export default User;
