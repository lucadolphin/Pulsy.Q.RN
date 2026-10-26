import { type NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import UpstreamHeader from '~/containers/Header';
import { ThemeContext, useTheme } from '~/theme';
import { HeaderChipProvider } from './headerChips';

// IOS/Talk26/app/ui/ExHeaderV2.tsx: the header is the green polygon background.jpg (its average, as a color),
// a big bold white title and the user's status (dot + lowercase label) next to it.
export const TALK_HEADER_BACKGROUND = '#23A586';
// Color of the strip behind the status bar: the top band of background.jpg, so the seam with the image isn't seen
export const TALK_STATUS_BAR_BACKGROUND = '#2AB389';

const HEADER_BACKGROUND_IMAGE = require('./assets/background.jpg');

/**
 * The app draws its own header (containers/Header) with `colors.surfaceNeutral` as background and `fontDefault` for
 * the buttons. It is recolored by giving it a theme where those are transparent and white, over Talk26's
 * background.jpg (ExHeader's `ImageBackground`); the strip behind the status bar takes the image's top color.
 */
const TalkHeader = ({ chips = false, ...props }: NativeStackHeaderProps & { chips?: boolean }) => {
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
				{chips ? (
					<HeaderChipProvider>
						<UpstreamHeader {...props} />
					</HeaderChipProvider>
				) : (
					<UpstreamHeader {...props} />
				)}
			</ThemeContext.Provider>
		</View>
	);
};

export const renderTalkHeader = (props: NativeStackHeaderProps) => <TalkHeader {...props} />;

/** The room's header: buttons as round chips (IOS/Talk26 ExHeaderDetailV2) */
export const renderTalkRoomHeader = (props: NativeStackHeaderProps) => <TalkHeader {...props} chips />;

const styles = StyleSheet.create({
	backgroundImage: {
		position: 'absolute',
		left: 0,
		right: 0
	}
});
