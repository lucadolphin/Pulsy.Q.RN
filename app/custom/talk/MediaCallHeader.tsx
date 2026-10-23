import { memo, useMemo } from 'react';

import UpstreamMediaCallHeader from '~/containers/MediaCallHeader/MediaCallHeader';
import { ThemeContext, useTheme } from '~/theme';
import { useStatusBarBackground } from './statusBarBackground';

/**
 * Drop-in for upstream's MediaCallHeader, which is also what paints the strip behind the status bar. While a screen
 * asks for its own color (see statusBarBackground.ts) the header gets a theme where `surfaceNeutral` is that color.
 */
const MediaCallHeader = () => {
	const theme = useTheme();
	const background = useStatusBarBackground();
	const value = useMemo(
		() => (background ? { ...theme, colors: { ...theme.colors, surfaceNeutral: background } } : theme),
		[theme, background]
	);
	return (
		<ThemeContext.Provider value={value}>
			<UpstreamMediaCallHeader />
		</ThemeContext.Provider>
	);
};

export default memo(MediaCallHeader);
