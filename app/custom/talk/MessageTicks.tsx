import { CustomIcon } from '~/containers/CustomIcon';
import { useIsOwnMessage, useMessageField } from '~/containers/message/stores/MessageStore';
import { useIsReadReceiptEnabled } from '~/containers/message/stores/MessageRoomStore';
import { messagesStatus } from '~/lib/constants/messagesStatus';
import { useTheme } from '~/theme';

const TICK_SIZE = 16;
const READ_COLOR = '#34B7F1';

/**
 * Delivery status after the time of my own messages (Talk26 InfoV2): clock while sending, one grey tick once sent,
 * two grey ticks once another user's device has it (`received`, filled by setMessageReceived like ROMEO's), two blue
 * ticks once read. Without read receipts a received message stays at two grey ticks.
 */
const MessageTicks = () => {
	const { colors } = useTheme();
	const isOwn = useIsOwnMessage();
	const status = useMessageField(item => item.status);
	const unread = useMessageField(item => item.unread);
	const received = useMessageField(item => item.received);
	const authorId = useMessageField(item => item.u?._id);
	const isReadReceiptEnabled = useIsReadReceiptEnabled();

	if (!isOwn || status === messagesStatus.ERROR) return null;
	if (status === messagesStatus.TEMP) return <CustomIcon name='clock' size={TICK_SIZE - 3} color={colors.fontSecondaryInfo} />;

	const isRead = isReadReceiptEnabled && unread === false;
	const isReceived = !!received?.some(entry => entry._id !== authorId);
	const isDouble = isRead || isReceived;
	return (
		<CustomIcon
			name={isDouble ? 'check-double' : 'check-single'}
			size={TICK_SIZE}
			color={isRead ? READ_COLOR : colors.fontSecondaryInfo}
			testID={isRead ? 'message-ticks-read' : isReceived ? 'message-ticks-received' : 'message-ticks-sent'}
		/>
	);
};

export default MessageTicks;
