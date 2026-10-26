import { render } from '@testing-library/react-native';

import { type RoomMembership } from '~/views/RoomView/definitions';
import RightButtons from '../RightButtons/RightButtons';

const mockNavigation = { navigate: jest.fn(), push: jest.fn() };
jest.mock('@react-navigation/native', () => ({
	useNavigation: () => mockNavigation
}));
const mockShowActionSheet = jest.fn();
jest.mock('~/containers/ActionSheet', () => ({
	useActionSheet: () => ({ showActionSheet: mockShowActionSheet })
}));
jest.mock('~/lib/hooks/useMasterDetail', () => ({
	...jest.requireActual('~/lib/hooks/useMasterDetail'),
	useMasterDetail: () => false
}));
jest.mock('~/theme', () => ({ useTheme: () => ({ colors: { fontDanger: '#f00' } }) }));
jest.mock('~/lib/helpers/getRoomAccessibilityLabel', () => ({ __esModule: true, default: () => 'label' }));
jest.mock('~/lib/methods/helpers', () => ({
	...jest.requireActual('~/lib/methods/helpers'),
	getRoomTitle: () => 'Room Title',
	isGroupChat: () => false
}));

let mockAppState = {
	login: { user: { id: 'u1', username: 'user', token: 'tok' } },
	settings: { Threads_enabled: true, Livechat_request_comment_when_closing_conversation: false },
	troubleshootingNotification: { issuesWithNotifications: false },
	permissions: { 'toggle-room-e2e-encryption': ['perm'] }
};
jest.mock('~/lib/hooks/useAppSelector', () => ({
	useAppSelector: (selector: (state: typeof mockAppState) => unknown) => selector(mockAppState)
}));

let mockRoomState = {
	room: { id: 'sub-1', rid: 'rid-1', t: 'c', name: 'general' } as any,
	membership: 'subscribed' as RoomMembership,
	canForwardGuest: false
};
jest.mock('zustand', () => ({
	useStore: (_store: unknown, selector: (state: typeof mockRoomState) => unknown) => selector(mockRoomState)
}));
jest.mock('~/ee/omnichannel/hooks/useCanReturnQueue', () => ({ useCanReturnQueue: () => false }));
jest.mock('~/views/RoomView/hooks/useCanPlaceLivechatOnHold', () => ({ useCanPlaceLivechatOnHold: () => false }));

let mockE2EEStatus = { showMissingE2EEKey: false, showE2EEDisabledRoom: false, hasE2EEWarning: false };
jest.mock('~/views/RoomView/hooks/useE2EEStatus', () => ({ useE2EEStatus: () => mockE2EEStatus }));

let mockHeaderHooks = {
	isFollowingThread: false,
	tunread: [] as string[],
	tunreadUser: [] as string[],
	tunreadGroup: [] as string[],
	isSelfDm: false,
	canToggleEncryption: false
};
jest.mock('~/views/RoomView/hooks/useThreadFollowing', () => ({ useThreadFollowing: () => mockHeaderHooks.isFollowingThread }));
jest.mock('~/views/RoomView/hooks/useSubscriptionUnreads', () => ({
	useSubscriptionUnreads: () => {
		const { tunread, tunreadUser, tunreadGroup, isSelfDm } = mockHeaderHooks;
		return { tunread, tunreadUser, tunreadGroup, isSelfDm };
	}
}));
jest.mock('~/lib/hooks/usePermissions', () => ({
	usePermissions: () => [mockHeaderHooks.canToggleEncryption]
}));

jest.mock('~/containers/Header/components/HeaderButton', () => {
	const ReactActual = jest.requireActual('react');
	return {
		Container: ({ children }: any) => ReactActual.createElement('Container', null, children),
		Item: (props: any) => ReactActual.createElement('Item', props),
		BadgeUnread: () => null
	};
});
jest.mock('../RightButtons/HeaderCallButton', () => {
	const ReactActual = jest.requireActual('react');
	return {
		HeaderCallButton: ({ rid, disabled, accessibilityLabel }: { rid: string; disabled: boolean; accessibilityLabel: string }) =>
			ReactActual.createElement('CallButton', { rid, disabled, accessibilityLabel, testID: 'header-call-button-stub' })
	};
});

const allTestIDs = [
	'room-view-header-menu',
	'header-call-button-stub',
	'room-view-header-omnichannel-kebab',
	'room-view-header-follow',
	'room-view-header-unfollow'
];

describe('RightButtons', () => {
	const roomStore = { getState: () => mockRoomState } as any;

	const expectOnly = (queryByTestId: (id: string) => unknown, present: string[]) => {
		present.forEach(id => expect(queryByTestId(id)).toBeTruthy());
		allTestIDs.filter(id => !present.includes(id)).forEach(id => expect(queryByTestId(id)).toBeNull());
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockAppState = {
			login: { user: { id: 'u1', username: 'user', token: 'tok' } },
			settings: { Threads_enabled: true, Livechat_request_comment_when_closing_conversation: false },
			troubleshootingNotification: { issuesWithNotifications: false },
			permissions: { 'toggle-room-e2e-encryption': ['perm'] }
		};
		mockRoomState = {
			room: { id: 'sub-1', rid: 'rid-1', t: 'c', name: 'general' },
			membership: 'subscribed',
			canForwardGuest: false
		};
		mockE2EEStatus = { showMissingE2EEKey: false, showE2EEDisabledRoom: false, hasE2EEWarning: false };
		mockHeaderHooks = {
			isFollowingThread: false,
			tunread: [],
			tunreadUser: [],
			tunreadGroup: [],
			isSelfDm: false,
			canToggleEncryption: false
		};
	});

	it('renders only the kebab for an active omnichannel room', () => {
		mockRoomState = { ...mockRoomState, room: { id: 'sub-1', rid: 'rid-1', t: 'l', name: 'chat' } };
		const { queryByTestId, toJSON } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		expectOnly(queryByTestId, ['room-view-header-omnichannel-kebab']);
		expect(toJSON()).toMatchSnapshot();
	});

	it('renders the unfollow button for a followed thread', () => {
		mockHeaderHooks = { ...mockHeaderHooks, isFollowingThread: true };
		const { queryByTestId, toJSON } = render(<RightButtons rid='rid-1' tmid='tmid-1' roomStore={roomStore} />);
		expectOnly(queryByTestId, ['room-view-header-unfollow']);
		expect(queryByTestId('room-view-header-unfollow')).toHaveProp('accessibilityLabel', 'Unfollow thread');
		expect(toJSON()).toMatchSnapshot();
	});

	it('renders the follow button for an unfollowed thread', () => {
		const { queryByTestId, toJSON } = render(<RightButtons rid='rid-1' tmid='tmid-1' roomStore={roomStore} />);
		expectOnly(queryByTestId, ['room-view-header-follow']);
		expect(queryByTestId('room-view-header-follow')).toHaveProp('accessibilityLabel', 'Follow thread');
		expect(toJSON()).toMatchSnapshot();
	});

	// The header shows the call and a menu: the rest is in the action sheet the menu opens
	const openMenu = (getByTestId: (id: string) => any) => {
		getByTestId('room-view-header-menu').props.onPress();
		const { options } = mockShowActionSheet.mock.calls[0][0];
		return options as { testID: string; enabled?: boolean; danger?: boolean }[];
	};
	const menuIds = (options: { testID: string }[]) => options.map(option => option.testID);

	it('renders call and the menu for a regular channel', () => {
		const { queryByTestId, getByTestId, toJSON } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		expectOnly(queryByTestId, ['header-call-button-stub', 'room-view-header-menu']);
		expect(menuIds(openMenu(getByTestId))).toEqual(['room-view-header-threads', 'room-view-search']);
		expect(toJSON()).toMatchSnapshot();
	});

	it('puts the encryption item in the menu, enabled when the user can toggle encryption', () => {
		mockRoomState = { ...mockRoomState, room: { id: 'sub-1', rid: 'rid-1', t: 'c', name: 'general', encrypted: true } };
		mockE2EEStatus = { showMissingE2EEKey: true, showE2EEDisabledRoom: false, hasE2EEWarning: true };
		mockHeaderHooks = { ...mockHeaderHooks, canToggleEncryption: true };
		const { getByTestId } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		const options = openMenu(getByTestId);
		expect(menuIds(options)).toEqual(['room-view-header-encryption', 'room-view-header-threads', 'room-view-search']);
		expect(options[0].enabled).toBe(true);
		expect(options[2].enabled).toBe(false);
	});

	it('disables the encryption item when the user cannot toggle encryption', () => {
		mockRoomState = { ...mockRoomState, room: { id: 'sub-1', rid: 'rid-1', t: 'c', name: 'general', encrypted: true } };
		mockE2EEStatus = { showMissingE2EEKey: true, showE2EEDisabledRoom: false, hasE2EEWarning: true };
		const { getByTestId } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		const options = openMenu(getByTestId);
		expect(menuIds(options)[0]).toBe('room-view-header-encryption');
		expect(options[0].enabled).toBe(false);
	});

	it('puts the encryption item in the menu when the room has e2ee disabled', () => {
		mockRoomState = { ...mockRoomState, room: { id: 'sub-1', rid: 'rid-1', t: 'c', name: 'general', encrypted: true } };
		mockE2EEStatus = { showMissingE2EEKey: false, showE2EEDisabledRoom: true, hasE2EEWarning: true };
		const { getByTestId } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		const options = openMenu(getByTestId);
		expect(menuIds(options)[0]).toBe('room-view-header-encryption');
		expect(options[0].enabled).toBe(false);
	});

	it('puts the push troubleshoot item in the menu when there are notification issues', () => {
		mockAppState = { ...mockAppState, troubleshootingNotification: { issuesWithNotifications: true } };
		const { getByTestId } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		const options = openMenu(getByTestId);
		expect(menuIds(options)).toEqual(['room-view-push-troubleshoot', 'room-view-header-threads', 'room-view-search']);
		expect(options[0].danger).toBe(true);
	});

	it('puts the notifications item in the menu when notifications are disabled for the room', () => {
		mockRoomState = {
			...mockRoomState,
			room: { id: 'sub-1', rid: 'rid-1', t: 'c', name: 'general', disableNotifications: true }
		};
		const { getByTestId } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		const options = openMenu(getByTestId);
		expect(menuIds(options)[0]).toBe('room-view-push-troubleshoot');
		expect(options[0].danger).toBe(false);
	});

	it('leaves the threads item out when threads are disabled', () => {
		mockAppState = {
			...mockAppState,
			settings: { Threads_enabled: false, Livechat_request_comment_when_closing_conversation: false }
		};
		const { queryByTestId, getByTestId } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		expectOnly(queryByTestId, ['header-call-button-stub', 'room-view-header-menu']);
		expect(menuIds(openMenu(getByTestId))).toEqual(['room-view-search']);
	});

	it('hides the call button on a self DM', () => {
		mockRoomState = { ...mockRoomState, room: { id: 'sub-1', rid: 'rid-1', t: 'd', name: 'user' } };
		mockHeaderHooks = { ...mockHeaderHooks, isSelfDm: true };
		const { queryByTestId, toJSON } = render(<RightButtons rid='rid-1' roomStore={roomStore} />);
		expectOnly(queryByTestId, ['room-view-header-menu']);
		expect(toJSON()).toMatchSnapshot();
	});
});
