import { type ComponentProps, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import UpstreamRoomView from '~/views/RoomView';
import { ThemeContext, useTheme } from '~/theme';
import { getTalkColors } from './talkTheme';

/**
 * Talk's chat background behind the room (IOS/Talk26 `backgroundChat`). A drop-in replacement for upstream's
 * RoomView screen: upstream paints `surfaceRoom` over the screen, so inside the room that token is Talk's
 * background, without touching `surfaceRoom` for lists and modals outside of it.
 */
const RoomView = (props: ComponentProps<typeof UpstreamRoomView>) => {
	const theme = useTheme();
	const background = getTalkColors(theme.theme).chatBackground;
	const value = useMemo(() => ({ ...theme, colors: { ...theme.colors, surfaceRoom: background } }), [theme, background]);
	return (
		<View style={[styles.container, { backgroundColor: background }]}>
			<ThemeContext.Provider value={value}>
				<UpstreamRoomView {...props} />
			</ThemeContext.Provider>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
});

export default RoomView;
