import { forwardRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import Emoji from '~/containers/message/components/Emoji';
import BubbleMeta from './BubbleMeta';

const STICKER_SIZE = 64;
// IOS/Talk26 utils/emojiTwemoji: the emoji is drawn as a picture, the same on every device
const TWEMOJI_CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72';

/** Twemoji codepoint of a Unicode emoji (e.g. "1f44d") */
const toTwemojiCodepoint = (emoji: string): string =>
	[...emoji]
		.map(symbol => symbol.codePointAt(0))
		.filter((cp): cp is number => cp !== undefined && cp !== 0xfe0f && cp !== 0xfe0e)
		.map(cp => cp.toString(16))
		.join('-');

const isEmojiCodepoint = (cp: number) =>
	(cp >= 0x1f000 && cp <= 0x1faff) ||
	(cp >= 0x2190 && cp <= 0x21ff) ||
	(cp >= 0x2300 && cp <= 0x23ff) ||
	(cp >= 0x2600 && cp <= 0x27bf) ||
	(cp >= 0x2b00 && cp <= 0x2bff) ||
	[0xa9, 0xae, 0x203c, 0x2049, 0x2122, 0x2139, 0x3030, 0x303d, 0x3297, 0x3299].includes(cp);

const ZWJ = 0x200d;
const isModifier = (cp: number) => cp === 0xfe0f || cp === 0xfe0e || cp === 0x20e3 || (cp >= 0x1f3fb && cp <= 0x1f3ff);
const isRegionalIndicator = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;

/** A text made of one emoji and nothing else (a ZWJ sequence, a flag or a skin tone is still one): shown as a sticker */
export const isSingleEmoji = (text?: string | null): boolean => {
	const value = text?.trim();
	if (!value) {
		return false;
	}
	let clusters = 0;
	let previous = 0;
	let flagHalf = false;
	for (const symbol of value) {
		const cp = symbol.codePointAt(0) as number;
		if (cp === ZWJ || isModifier(cp)) {
			previous = cp;
			continue;
		}
		if (!isEmojiCodepoint(cp) && !isRegionalIndicator(cp)) {
			return false;
		}
		if (isRegionalIndicator(cp)) {
			// two regional indicators are one flag
			flagHalf = !flagHalf;
			if (flagHalf && previous !== ZWJ) {
				clusters += 1;
			}
		} else if (previous !== ZWJ) {
			clusters += 1;
		}
		previous = cp;
	}
	return clusters === 1;
};

const isCustomEmoji = (emoji: string) => /^:[^:\s]+:$/.test(emoji.trim());

/** IOS/Talk26 StickerMessageV2: a big emoji picture without a bubble, with the time under it */
const StickerMessage = forwardRef<View, { emoji: string; isOwn: boolean }>(function StickerMessage({ emoji, isOwn }, ref) {
	const [failed, setFailed] = useState(false);
	const codepoint = toTwemojiCodepoint(emoji);
	const picture = !isCustomEmoji(emoji) && !failed && !!codepoint;

	return (
		<View ref={ref} collapsable={false} style={[styles.wrap, { alignItems: isOwn ? 'flex-end' : 'flex-start' }]}>
			{picture ? (
				<Image
					source={{ uri: `${TWEMOJI_CDN}/${codepoint}.png` }}
					style={styles.picture}
					contentFit='contain'
					onError={() => setFailed(true)}
				/>
			) : isCustomEmoji(emoji) ? (
				<Emoji content={emoji} standardEmojiStyle={styles.emoji} customEmojiStyle={styles.picture} />
			) : (
				<Text style={styles.emoji}>{emoji}</Text>
			)}
			<View style={styles.meta}>
				<BubbleMeta />
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	wrap: {
		minWidth: 72,
		minHeight: 72,
		justifyContent: 'center'
	},
	picture: {
		width: STICKER_SIZE,
		height: STICKER_SIZE
	},
	emoji: {
		fontSize: STICKER_SIZE,
		lineHeight: STICKER_SIZE + 12,
		textAlign: 'center'
	},
	meta: {
		marginTop: 2
	}
});

export default StickerMessage;
