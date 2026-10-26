import { useIsFocused, useNavigation } from '@react-navigation/native';
import { memo, useCallback, useEffect, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { setUser } from '~/actions/login';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import sdk from '~/lib/services/sdk';
import { store } from '~/lib/store/auxStore';
import { claimStatusBarBackground } from './statusBarBackground';
import { renderTalkHeader, TALK_STATUS_BAR_BACKGROUND } from './TalkHeader';
import UpstreamRoomsListHeader from '~/views/RoomsListView/components/Header';

export { renderTalkHeader, TALK_HEADER_BACKGROUND, TALK_STATUS_BAR_BACKGROUND } from './TalkHeader';

const STATUS_COLORS: Record<string, string> = {
	online: '#4caf50',
	away: '#ffc107',
	busy: '#f3565d',
	offline: '#9e9e9e'
};

/** Talk26 toggles between online and away; offline can't be changed from the header. */
export const getNextStatus = (status: string): string | null => {
	if (status === 'online') {
		return 'away';
	}
	if (status === 'away' || status === 'busy') {
		return 'online';
	}
	return null;
};

/** Like Talk26: the user's status while connected, offline without a connection. */
export const resolveStatus = (status: string | undefined, connected: boolean): string => {
	if (!connected) {
		return 'offline';
	}
	return status || 'online';
};

interface IRoomsListHeaderProps {
	search: (text: string) => void;
	searchEnabled: boolean;
}

/**
 * Talk26 look for the rooms list header. Search mode is upstream's (a search field), and so are the buttons at
 * the sides: only the title block and the color of the bar change. Same props as upstream's header (drop-in).
 */
const RoomsListHeader = ({ search, searchEnabled }: IRoomsListHeaderProps) => {
	const navigation = useNavigation();
	const serverName = useAppSelector(state => state.settings.Site_Name as string);
	const userStatus = useAppSelector(state => state.login.user?.status as string | undefined);
	const connected = useAppSelector(state => state.meteor.connected);
	const status = resolveStatus(userStatus, connected);

	useLayoutEffect(() => {
		navigation.setOptions({ header: renderTalkHeader });
	}, [navigation]);

	// The strip behind the status bar isn't part of this header (see statusBarBackground.ts): green while the
	// list is on screen, released when it leaves.
	const isFocused = useIsFocused();
	useEffect(() => {
		if (!isFocused) {
			return;
		}
		return claimStatusBarBackground(TALK_STATUS_BAR_BACKGROUND);
	}, [isFocused]);

	const toggleStatus = useCallback(async () => {
		const next = getNextStatus(status);
		if (!next) {
			return;
		}
		try {
			await sdk.methodCall('UserPresence:setDefaultStatus', next);
			store.dispatch(setUser({ status: next } as never));
		} catch {
			// Not changed: the badge keeps showing the real status
		}
	}, [status]);

	if (searchEnabled) {
		return <UpstreamRoomsListHeader search={search} searchEnabled={searchEnabled} />;
	}

	return (
		<View style={styles.container} testID='talk-rooms-list-header'>
			<Text style={styles.title} numberOfLines={1}>
				{serverName}
			</Text>
			<Pressable
				style={styles.status}
				onPress={toggleStatus}
				disabled={!getNextStatus(status)}
				hitSlop={8}
				accessibilityRole='button'
				accessibilityLabel={`Status: ${status}`}
				testID='talk-rooms-list-header-status'>
				<View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
				<Text style={styles.statusLabel} numberOfLines={1}>
					{status}
				</Text>
			</Pressable>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 10
	},
	title: {
		flexShrink: 1,
		color: '#ffffff',
		fontSize: 24,
		fontWeight: '700'
	},
	status: {
		flexShrink: 0,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ffffff'
	},
	statusLabel: {
		marginLeft: 6,
		color: '#ffffff',
		fontSize: 14,
		textTransform: 'lowercase'
	}
});

export default memo(RoomsListHeader);
