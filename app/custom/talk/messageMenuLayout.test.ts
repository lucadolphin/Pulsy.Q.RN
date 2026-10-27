import { computeMenuTop } from './messageMenuLayout';

const chat = { chatTop: 127, chatBottom: 708, gap: 6 };

describe('computeMenuTop', () => {
	it('goes below a bubble at the top edge', () => {
		expect(computeMenuTop({ ...chat, anchorY: 130, anchorHeight: 40, totalHeight: 200 })).toBe(176);
	});

	it('goes above a bubble at the bottom edge', () => {
		expect(computeMenuTop({ ...chat, anchorY: 650, anchorHeight: 40, totalHeight: 200 })).toBe(444);
	});

	it('stays under the header for a bubble that starts above the chat area', () => {
		expect(computeMenuTop({ ...chat, anchorY: 60, anchorHeight: 40, totalHeight: 200 })).toBeGreaterThanOrEqual(chat.chatTop);
	});

	it('stays above the composer for a bubble below the chat area', () => {
		const top = computeMenuTop({ ...chat, anchorY: 800, anchorHeight: 40, totalHeight: 200 });
		expect(top + 200).toBeLessThanOrEqual(chat.chatBottom);
	});

	it('is squeezed inside the chat area when it fits neither above nor below', () => {
		const top = computeMenuTop({ ...chat, anchorY: 300, anchorHeight: 150, totalHeight: 400 });
		expect(top).toBeGreaterThanOrEqual(chat.chatTop);
		expect(top + 400).toBeLessThanOrEqual(chat.chatBottom);
	});

	it('fits a menu as tall as the whole chat area', () => {
		expect(computeMenuTop({ ...chat, anchorY: 300, anchorHeight: 40, totalHeight: 581 })).toBe(127);
	});
});
