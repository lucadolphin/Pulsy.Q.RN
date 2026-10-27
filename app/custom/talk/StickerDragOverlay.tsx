import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import Emoji from '~/containers/message/components/Emoji';
import useShortnameToUnicode from '~/lib/hooks/useShortnameToUnicode';
import { dragOverZone, dragX, dragY, overlayOriginX, overlayOriginY, stickerText, useStickerDrag } from './stickerDrag';

const SIZE = 64;
const GLYPH = 44;
// Held a little above the finger, so the finger doesn't cover it
const LIFT = 24;

/** The emoji that follows the finger while it is dragged out of the picker (IOS/Talk26): big, with a soft glow */
const StickerDragOverlay = () => {
	const { active, emoji } = useStickerDrag();
	const { formatShortnameToUnicode } = useShortnameToUnicode();
	const root = useRef<View>(null);

	const style = useAnimatedStyle(() => ({
		transform: [
			{ translateX: dragX.value - overlayOriginX.value - SIZE / 2 },
			{ translateY: dragY.value - overlayOriginY.value - SIZE / 2 - LIFT },
			{ scale: withSpring(dragOverZone.value ? 1.3 : 1, { damping: 14, stiffness: 220 }) }
		]
	}));

	return (
		<View
			ref={root}
			collapsable={false}
			pointerEvents='none'
			style={StyleSheet.absoluteFill}
			onLayout={() =>
				root.current?.measureInWindow((x, y) => {
					overlayOriginX.value = x;
					overlayOriginY.value = y;
				})
			}>
			{active && emoji ? (
				<Animated.View style={[styles.emoji, style]}>
					<Emoji
						content={stickerText(emoji, formatShortnameToUnicode)}
						standardEmojiStyle={styles.glyph}
						customEmojiStyle={styles.custom}
					/>
				</Animated.View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	emoji: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: SIZE,
		height: SIZE,
		alignItems: 'center',
		justifyContent: 'center'
	},
	glyph: {
		fontSize: GLYPH,
		lineHeight: SIZE,
		textAlign: 'center',
		textShadowColor: 'rgba(255, 170, 0, 0.55)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 18
	},
	custom: {
		width: GLYPH,
		height: GLYPH
	}
});

export default StickerDragOverlay;
