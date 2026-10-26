import { type ComponentProps, useMemo } from 'react';
import { ImageBackground, StyleSheet, useWindowDimensions } from 'react-native';

import UpstreamRoomView from '~/views/RoomView';
import { ThemeContext, useTheme } from '~/theme';
import { getTalkColors } from './talkTheme';
import { useTalkRoomHeader } from './useTalkRoomHeader';

const CHAT_BACKGROUND = require('./assets/bgchat.jpg');
const CHAT_BACKGROUND_TABLET = require('./assets/bgchatTablet.jpg');
const TABLET_MIN_WIDTH = 768;

/**
 * Talk's chat background behind the room (IOS/Talk26 `backgroundChat`). A drop-in replacement for upstream's
 * RoomView screen: upstream paints `surfaceRoom` over the screen, so inside the room that token is Talk's
 * background, without touching `surfaceRoom` for lists and modals outside of it. In the light theme the background is
 * Talk26's pattern image (`bgChat`), so `surfaceRoom` is transparent to let it show through.
 */
const RoomView = (props: ComponentProps<typeof UpstreamRoomView>) => {
	const theme = useTheme();
	useTalkRoomHeader();
	const { width } = useWindowDimensions();
	const background = getTalkColors(theme.theme).chatBackground;
	const hasImage = theme.theme === 'light';
	const value = useMemo(
		() => ({ ...theme, colors: { ...theme.colors, surfaceRoom: hasImage ? 'transparent' : background } }),
		[theme, background, hasImage]
	);
	return (
		<ImageBackground
			source={width >= TABLET_MIN_WIDTH ? CHAT_BACKGROUND_TABLET : CHAT_BACKGROUND}
			resizeMode='cover'
			style={[styles.container, { backgroundColor: background }]}
			imageStyle={hasImage ? undefined : styles.hidden}>
			<ThemeContext.Provider value={value}>
				<UpstreamRoomView {...props} />
			</ThemeContext.Provider>
		</ImageBackground>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	hidden: {
		opacity: 0
	}
});

export default RoomView;
