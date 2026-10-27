/**
 * Where the menu goes next to a bubble: below it when it fits, otherwise above, otherwise squeezed into the chat area.
 * The result is always inside [chatTop, chatBottom - totalH], so the menu never reaches the header or the composer.
 */
export const computeMenuTop = ({
	anchorY,
	anchorHeight,
	totalHeight,
	chatTop,
	chatBottom,
	gap
}: {
	anchorY: number;
	anchorHeight: number;
	totalHeight: number;
	chatTop: number;
	chatBottom: number;
	gap: number;
}): number => {
	const below = anchorY + anchorHeight + gap;
	const maxTop = chatBottom - totalHeight;
	let top: number;
	if (chatBottom - (anchorY + anchorHeight) >= totalHeight + gap) {
		top = below;
	} else if (anchorY - chatTop >= totalHeight + gap) {
		top = anchorY - totalHeight - gap;
	} else {
		top = below;
	}
	return Math.max(chatTop, Math.min(top, maxTop));
};
