import { type ComponentProps, useEffect, useMemo } from 'react';
import { ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';

import UpstreamRoomView from '~/views/RoomView';
import { ThemeContext, useTheme } from '~/theme';
import { getTalkColors } from './talkTheme';
import { useTalkRoomHeader } from './useTalkRoomHeader';
import MessageMenu from './MessageMenu';
import StickerDragOverlay from './StickerDragOverlay';
import { registerStickerSender } from './stickerDrag';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import { getUserSelector } from '~/selectors/login';
import { sendMessage } from '~/lib/methods/sendMessage';

const CHAT_BACKGROUND = require('./assets/bgchat.jpg');
const CHAT_BACKGROUND_TABLET = require('./assets/bgchatTablet.jpg');
const CHAT_BACKGROUND_DARK = require('./assets/bgchatDark.jpg');
const CHAT_BACKGROUND_TABLET_DARK = require('./assets/bgchatTabletDark.jpg');
const TABLET_MIN_WIDTH = 768;

/**
 * Talk's chat background behind the room (IOS/Talk26 `backgroundChat`). A drop-in replacement for upstream's
 * RoomView screen: upstream paints `surfaceRoom` over the screen, so inside the room that token is Talk's
 * background, without touching `surfaceRoom` for lists and modals outside of it. The background is
 * Talk26's pattern image (`bgChat`), in a light and a dark version, so `surfaceRoom` is transparent to let it show through.
 */
const RoomView = (props: ComponentProps<typeof UpstreamRoomView>) => {
	const theme = useTheme();
	useTalkRoomHeader();
	const user = useAppSelector(getUserSelector);
	const { rid, tmid } = props.route.params ?? {};
	// An emoji dragged out of the picker is sent as a message of type sticker
	useEffect(() => {
		if (!rid) {
			return;
		}
		return registerStickerSender(text => {
			sendMessage(rid, text, tmid, user, undefined, 'sticker');
		});
	}, [rid, tmid, user]);
	const { width } = useWindowDimensions();
	const background = getTalkColors(theme.theme).chatBackground;
	// `surfaceRoom` is transparent so the pattern shows through; the dark themes have their own, dark, version of it
	const isDark = theme.theme !== 'light';
	const isTablet = width >= TABLET_MIN_WIDTH;
	let source = isTablet ? CHAT_BACKGROUND_TABLET : CHAT_BACKGROUND;
	if (isDark) {
		source = isTablet ? CHAT_BACKGROUND_TABLET_DARK : CHAT_BACKGROUND_DARK;
	}
	const value = useMemo(() => ({ ...theme, colors: { ...theme.colors, surfaceRoom: 'transparent' } }), [theme]);
	return (
		<ImageBackground source={source} resizeMode='cover' style={[styles.container, { backgroundColor: background }]}>
			<ThemeContext.Provider value={value}>
				<UpstreamRoomView {...props} />
				<MessageMenu />
				<StickerDragOverlay />
			</ThemeContext.Provider>
		</ImageBackground>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
});

export default RoomView;
