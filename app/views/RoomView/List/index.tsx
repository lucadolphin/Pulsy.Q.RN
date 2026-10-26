import { forwardRef, useEffect, useImperativeHandle } from 'react';

import { useDebounce } from '~/lib/methods/helpers';
import EmptyRoom from './components/EmptyRoom';
import List from './components/List';
import ConversationStart from './components/ConversationStart';
import { useHistoryLoaded } from '~/lib/methods/historyLoadedRooms';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import { MESSAGE_TYPE_ANY_LOAD, type MessageTypeLoad } from '~/lib/constants/messageTypeLoad';
import { MessageRow } from '../components/MessageRow';
import { type IListContainerProps, type IListContainerRef, type IListProps } from '../definitions';
import { useMessages } from './hooks/useMessages';
import { useScroll } from './hooks/useScroll';

const ListContainer = forwardRef<IListContainerRef, IListContainerProps>(
	({ rid, tmid, t, onLongPress, showMessageInMainThread, hideSystemMessages, flatListRef, serverVersion }, ref) => {
		const [messages, messagesIds, fetchMessages, { highTs, setHighTs, loadOlderMessages, hasOlderLocalRows }] = useMessages({
			rid,
			tmid,
			showMessageInMainThread,
			hideSystemMessages,
			t,
			serverVersion
		});
		const { jumpToBottom, jumpToMessage, cancelJumpToMessage, handleScrollToIndexFailed, highlightedMessageId, isReleasing } =
			useScroll({
				flatListRef,
				messages,
				messagesIds,
				highTs,
				setHighTs,
				fetchMessages,
				tmid
			});

		const historyLoaded = useHistoryLoaded(rid);
		const historyLoading = useAppSelector(state => state.room.historyLoaders.length > 0);

		const onEndReached = useDebounce(loadOlderMessages, 300);

		useEffect(() => onEndReached.cancel, [onEndReached]);

		useImperativeHandle(ref, () => ({
			jumpToMessage,
			cancelJumpToMessage,
			isMessageInWindow: (messageId: string) => messagesIds.current?.includes(messageId) ?? false
		}));

		const renderItem: IListProps['renderItem'] = ({ item, index }) => (
			<MessageRow
				item={item}
				previousItem={messages[index + 1]}
				highlightedMessage={highlightedMessageId ?? undefined}
				onLongPress={onLongPress}
			/>
		);

		// Nothing older to fetch: the history was loaded, none is loading, the window shows every local row and the
		// oldest one isn't a "load more" row
		const oldest = messages[messages.length - 1];
		const reachedStart =
			!tmid &&
			historyLoaded &&
			!historyLoading &&
			!hasOlderLocalRows &&
			!!oldest &&
			!MESSAGE_TYPE_ANY_LOAD.includes(oldest.t as MessageTypeLoad);

		return (
			<>
				<EmptyRoom rid={rid} length={messages.length} />
				<List
					flatListRef={flatListRef}
					data={messages}
					renderItem={renderItem}
					onEndReached={onEndReached}
					ListFooterComponent={reachedStart ? <ConversationStart /> : null}
					onScrollToIndexFailed={handleScrollToIndexFailed}
					jumpToBottom={jumpToBottom}
					isAnchored={highTs != null}
					maintainVisibleContentPosition={
						isReleasing
							? undefined
							: {
									minIndexForVisible: 0,
									autoscrollToTopThreshold: 0
								}
					}
				/>
			</>
		);
	}
);

export default ListContainer;
