import { type ReactElement } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useNavigation } from '@react-navigation/native';

import * as HeaderButton from '~/containers/Header/components/HeaderButton';
import { useActionSheet, type TActionSheetOptionsItem } from '~/containers/ActionSheet';
import { type ISubscription, type SubscriptionType, type TSubscriptionModel, type TUserStatus } from '~/definitions';
import i18n from '~/i18n';
import { getRoomTitle, isGroupChat } from '~/lib/methods/helpers';
import { events, logEvent } from '~/lib/methods/helpers/log';
import getRoomAccessibilityLabel from '~/lib/helpers/getRoomAccessibilityLabel';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import { useMasterDetail } from '~/lib/hooks/useMasterDetail';
import { usePermissions } from '~/lib/hooks/usePermissions';
import { useSetting } from '~/lib/hooks/useSetting';
import { getUserSelector } from '~/selectors/login';
import { type RoomStore } from '~/views/RoomView/definitions';
import { isSubscriptionModel } from '~/definitions/TRoom';
import { fromSubscription } from '~/views/RoomView/stores/RoomStoreContext';
import { useE2EEStatus } from '~/views/RoomView/hooks/useE2EEStatus';
import { useSubscriptionUnreads } from '~/views/RoomView/hooks/useSubscriptionUnreads';
import { navigateToScreen, type TRoomStackNavigation } from '~/views/RoomView/services/navigateToScreen';
import { HeaderCallButton } from './HeaderCallButton';

interface IRoomRightButtonsProps {
	rid: string;
	roomStore: RoomStore;
}

export const RoomRightButtons = ({ rid, roomStore }: IRoomRightButtonsProps): ReactElement => {
	const navigation = useNavigation<TRoomStackNavigation>();
	const isMasterDetail = useMasterDetail();
	const { showActionSheet } = useActionSheet();

	const userId = useAppSelector(state => getUserSelector(state).id);
	const threadsEnabled = useSetting('Threads_enabled') as boolean;
	const issuesWithNotifications = useAppSelector(state => state.troubleshootingNotification.issuesWithNotifications);

	const { t, status, roomName, roomIsGroupChat, teamMain, encrypted, disableNotifications, cardId } = useStore(
		roomStore,
		useShallow(s => {
			const room = s.room;
			return {
				t: room.t as SubscriptionType,
				status: fromSubscription(r => r.status, undefined)(s),
				roomName: getRoomTitle(room),
				roomIsGroupChat: isGroupChat(room as ISubscription),
				teamMain: fromSubscription(r => !!r.teamMain, false)(s),
				encrypted: fromSubscription(r => r.encrypted, undefined)(s),
				disableNotifications: (room as ISubscription).disableNotifications,
				cardId: fromSubscription(r => r.cardId, undefined)(s)
			};
		})
	);
	const { hasE2EEWarning } = useE2EEStatus(roomStore);
	const { tunread, tunreadUser, tunreadGroup, isSelfDm } = useSubscriptionUnreads(roomStore, userId);
	const [canToggleEncryption] = usePermissions(['toggle-room-e2e-encryption'], rid);

	const goThreadsView = () => {
		logEvent(events.ROOM_GO_THREADS);
		navigateToScreen({ navigation, isMasterDetail, screen: 'ThreadMessagesView', params: { rid, t } });
	};

	const navigateToNotificationOrPushTroubleshoot = () => {
		const room = roomStore.getState().room;
		if (!isSubscriptionModel(room)) {
			return;
		}
		if (!issuesWithNotifications) {
			navigateToScreen({
				navigation,
				isMasterDetail,
				screen: 'NotificationPrefView',
				params: { rid, room: room as TSubscriptionModel }
			});
		} else {
			navigateToScreen({ navigation, isMasterDetail, screen: 'PushTroubleshootView' });
		}
	};

	const goSearchView = () => {
		logEvent(events.ROOM_GO_SEARCH);
		navigateToScreen({
			navigation,
			isMasterDetail,
			screen: 'SearchMessagesView',
			params: isMasterDetail ? { rid, t, encrypted, showCloseModal: true } : { rid, t, encrypted }
		});
	};

	const goE2EEToggleRoomView = () => {
		logEvent(events.ROOM_GO_E2EE);
		navigateToScreen({ navigation, isMasterDetail, screen: 'E2EEToggleRoomView', params: { rid } });
	};

	const threadsAccessibilityLabel = () => {
		if (!tunread.length) {
			return i18n.t('Threads');
		}
		if (tunreadUser?.length) {
			return i18n.t('Threads_dm_unread', { unread: tunreadUser?.length });
		}
		if (tunreadGroup?.length) {
			return i18n.t('Threads_group_unread', { unread: tunreadGroup?.length });
		}
		return i18n.t('Threads_unread', { unread: tunread?.length });
	};

	const accessibilityRoomName =
		!roomIsGroupChat && t === 'd' && !!userId
			? roomName
			: getRoomAccessibilityLabel({ type: t, userId, isGroupChat: roomIsGroupChat, status: status as TUserStatus, teamMain });

	// Call stays in the header; the rest (Talk26's header shows only the call and a menu) is in the menu
	const menuOptions: TActionSheetOptionsItem[] = [];
	if (hasE2EEWarning) {
		menuOptions.push({
			title: i18n.t('E2E_Encryption'),
			icon: 'encrypted',
			onPress: goE2EEToggleRoomView,
			enabled: canToggleEncryption,
			testID: 'room-view-header-encryption'
		});
	}
	if (issuesWithNotifications || disableNotifications) {
		menuOptions.push({
			title: issuesWithNotifications ? i18n.t('Troubleshooting') : i18n.t('Notification_Preferences'),
			icon: 'notification-disabled',
			danger: !!issuesWithNotifications,
			onPress: navigateToNotificationOrPushTroubleshoot,
			enabled: !hasE2EEWarning,
			testID: 'room-view-push-troubleshoot'
		});
	}
	if (threadsEnabled) {
		menuOptions.push({
			title: i18n.t('Threads'),
			accessibilityLabel: threadsAccessibilityLabel(),
			icon: 'threads',
			onPress: goThreadsView,
			enabled: !hasE2EEWarning,
			testID: 'room-view-header-threads'
		});
	}
	menuOptions.push({
		title: i18n.t('Search_Messages'),
		icon: 'search',
		onPress: goSearchView,
		enabled: !hasE2EEWarning,
		testID: 'room-view-search'
	});

	const openMenu = () => showActionSheet({ options: menuOptions });

	// TALK: rooms that belong to an EMA card open its task panel
	const goCardDetails = () => (navigation as any).navigate('CardDetailsView', { rid, cardId });

	return (
		<HeaderButton.Container>
			{!isSelfDm ? (
				<HeaderCallButton
					accessibilityLabel={i18n.t('Call_room_name', { roomName: accessibilityRoomName })}
					rid={rid}
					disabled={hasE2EEWarning}
				/>
			) : null}
			{cardId ? (
				<HeaderButton.Item
					accessibilityLabel={i18n.t('Card_details')}
					iconName='check'
					onPress={goCardDetails}
					testID='room-view-header-card'
				/>
			) : null}
			<HeaderButton.Item
				accessibilityLabel={i18n.t('More')}
				iconName='kebab'
				onPress={openMenu}
				testID='room-view-header-menu'
				badge={() => <HeaderButton.BadgeUnread tunread={tunread} tunreadUser={tunreadUser} tunreadGroup={tunreadGroup} />}
			/>
		</HeaderButton.Container>
	);
};
