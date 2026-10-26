import { CustomIcon } from '~/containers/CustomIcon';
import { useIsOwnMessage, useMessageField } from '~/containers/message/stores/MessageStore';
import { useIsReadReceiptEnabled } from '~/containers/message/stores/MessageRoomStore';
import { messagesStatus } from '~/lib/constants/messagesStatus';
import { useTheme } from '~/theme';

const TICK_SIZE = 16;
const READ_COLOR = '#34B7F1';

/**
 * Delivery status after the time of my own messages (Talk26 InfoV2): clock while sending, one grey tick once sent,
 * two blue ticks once read. Rocket.Chat has no "delivered" state, and without read receipts a sent message stays at one tick.
 */
const MessageTicks = () => {
	const { colors } = useTheme();
	const isOwn = useIsOwnMessage();
	const status = useMessageField(item => item.status);
	const unread = useMessageField(item => item.unread);
	const isReadReceiptEnabled = useIsReadReceiptEnabled();

	if (!isOwn || status === messagesStatus.ERROR) return null;
	if (status === messagesStatus.TEMP) return <CustomIcon name='clock' size={TICK_SIZE - 3} color={colors.fontSecondaryInfo} />;

	const isRead = isReadReceiptEnabled && unread === false;
	return (
		<CustomIcon
			name={isRead ? 'check-double' : 'check-single'}
			size={TICK_SIZE}
			color={isRead ? READ_COLOR : colors.fontSecondaryInfo}
			testID={isRead ? 'message-ticks-read' : 'message-ticks-sent'}
		/>
	);
};

export default MessageTicks;
