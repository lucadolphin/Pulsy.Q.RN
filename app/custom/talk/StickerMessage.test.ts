import { isSingleEmoji } from './StickerMessage';

describe('isSingleEmoji', () => {
	it.each(['😀', '👍', '❤️', '👨‍👩‍👧', '👍🏽', '🇮🇹', ' 😭 '])('is one emoji: %s', text => {
		expect(isSingleEmoji(text)).toBe(true);
	});

	it.each(['', 'a', '😀😀', '😀 ok', 'ok', '1', '🇮🇹🇫🇷'])('is not one emoji: %s', text => {
		expect(isSingleEmoji(text)).toBe(false);
	});
});
