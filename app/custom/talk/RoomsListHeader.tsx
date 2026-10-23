import { useIsFocused, useNavigation } from '@react-navigation/native';
import { type NativeStackHeaderProps } from '@react-navigation/native-stack';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { setUser } from '~/actions/login';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import sdk from '~/lib/services/sdk';
import { store } from '~/lib/store/auxStore';
import UpstreamHeader from '~/containers/Header';
import { setStatusBarBackground } from './statusBarBackground';
import { ThemeContext, useTheme } from '~/theme';
import UpstreamRoomsListHeader from '~/views/RoomsListView/components/Header';

// IOS/Talk26/app/ui/ExHeaderV2.tsx: the header is the green polygon background.jpg (its average, as a color),
// a big bold white title and the user's status (dot + lowercase label) next to it.
export const TALK_HEADER_BACKGROUND = '#23A586';
// Color of the strip behind the status bar: the top band of background.jpg, so the seam with the image isn't seen
export const TALK_STATUS_BAR_BACKGROUND = '#2AB389';

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

const HEADER_BACKGROUND_IMAGE = require('./assets/background.jpg');

/**
 * The app draws its own header (containers/Header) with `colors.surfaceNeutral` as background and `fontDefault` for
 * the buttons. It is recolored by giving it a theme where those are transparent and white, over Talk26's
 * background.jpg (ExHeader's `ImageBackground`); the strip behind the status bar takes the image's top color.
 */
const TalkHeader = (props: NativeStackHeaderProps) => {
	const theme = useTheme();
	const value = useMemo(
		() => ({
			...theme,
			colors: {
				...theme.colors,
				surfaceNeutral: 'transparent',
				strokeLight: 'transparent',
				fontDefault: '#ffffff',
				fontTitlesLabels: '#ffffff',
				fontSecondaryInfo: 'rgba(255,255,255,0.8)'
			}
		}),
		[theme]
	);
	// Explicit size: left to the insets alone the absolute image takes its natural height and covers the list
	const [height, setHeight] = useState(0);
	return (
		<View
			style={{ backgroundColor: TALK_HEADER_BACKGROUND }}
			onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}>
			<Image
				source={HEADER_BACKGROUND_IMAGE}
				resizeMode='cover'
				style={[styles.backgroundImage, { top: 0, height }]}
				testID='talk-rooms-list-header-background'
			/>
			<ThemeContext.Provider value={value}>
				<UpstreamHeader {...props} />
			</ThemeContext.Provider>
		</View>
	);
};

const renderTalkHeader = (props: NativeStackHeaderProps) => <TalkHeader {...props} />;

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
		setStatusBarBackground(TALK_STATUS_BAR_BACKGROUND);
		return () => setStatusBarBackground(null);
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
	backgroundImage: {
		position: 'absolute',
		left: 0,
		right: 0
	},
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
