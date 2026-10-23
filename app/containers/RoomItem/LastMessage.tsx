import { dequal } from 'dequal';
import { memo } from 'react';
import { type TextStyle } from 'react-native';

import { SubscriptionType } from '~/definitions';

import I18n from '~/i18n';
import { formatLastMessage } from '~/lib/methods/formatLastMessage';
import { isAndroid } from '~/lib/methods/helpers';
import { useTheme } from '~/theme';
import { MarkdownPreview } from '../markdown';
import { type ILastMessageProps } from './interfaces';
import styles from './styles';

const getTypingText = (type: ILastMessageProps['type'], typingUsers: ILastMessageProps['typingUsers'] = [], useRealName: boolean) => {
	if (type === SubscriptionType.DIRECT || !typingUsers.length) {
		return I18n.t('is_typing');
	}
	const names = typingUsers.map(user => (useRealName && user.name) || user.username).join(', ');
	return `${names} ${I18n.t(typingUsers.length > 1 ? 'are_typing' : 'is_typing')}`;
};

const arePropsEqual = (oldProps: any, newProps: any) => dequal(oldProps, newProps);

const LastMessage = memo(({ isTyping, typingUsers, lastMessage, type, showLastMessage, username, alert, useRealName }: ILastMessageProps) => {
	const { colors } = useTheme();
	// Android has a bug with the text align on the markdown preview
	const alignSelf: TextStyle = isAndroid ? { alignSelf: 'stretch' } : {};

	return (
		<MarkdownPreview
			msg={
				isTyping
					? `${getTypingText(type, typingUsers, useRealName)}…`
					: formatLastMessage({
							lastMessage,
							type,
							showLastMessage,
							username,
							useRealName
						})
			}
			style={[styles.markdownText, { color: alert ? colors.fontDefault : colors.fontSecondaryInfo }, alignSelf]}
			numberOfLines={2}
		/>
	);
}, arePropsEqual);

export default LastMessage;
