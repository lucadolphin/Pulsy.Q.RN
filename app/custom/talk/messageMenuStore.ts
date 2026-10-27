import { type RefObject } from 'react';
import { type View } from 'react-native';

import { type TActionSheetOptionsItem } from '~/containers/ActionSheet';

export type TCornerRadii = { tl: number; tr: number; br: number; bl: number };
export type TMessageAnchor = { x: number; y: number; width: number; height: number; radii: TCornerRadii };

const DEFAULT_RADII: TCornerRadii = { tl: 8, tr: 8, br: 8, bl: 8 };

export type TMessageMenuPayload = {
	anchor: TMessageAnchor;
	isOwn: boolean;
	options: TActionSheetOptionsItem[];
	/** Shortnames shown in the reaction bar; without them the bar is left out */
	quickReactions?: string[];
	onReaction?: (shortname: string) => void;
	onMoreReactions?: () => void;
	onClose?: () => void;
};

type TBubble = { ref: RefObject<View | null>; extraBottom: number; radii: TCornerRadii };
const bubbles = new Map<string, TBubble>();

/**
 * The bubble of a message, registered by its row so the menu can sit over it. `extraBottom` is what hangs under the
 * bubble (the reactions), which stays lit with it; `radii` are the corners of the bubble.
 */
export const registerBubble = (
	messageId: string,
	ref: RefObject<View | null>,
	{ extraBottom = 0, radii = DEFAULT_RADII }: { extraBottom?: number; radii?: TCornerRadii } = {}
) => {
	const bubble = { ref, extraBottom, radii };
	bubbles.set(messageId, bubble);
	return () => {
		if (bubbles.get(messageId) === bubble) {
			bubbles.delete(messageId);
		}
	};
};

export const measureBubble = (messageId: string): Promise<TMessageAnchor | null> =>
	new Promise(resolve => {
		const bubble = bubbles.get(messageId);
		const view = bubble?.ref.current;
		if (!bubble || !view) {
			resolve(null);
			return;
		}
		view.measureInWindow((x, y, width, height) =>
			resolve(width > 0 && height > 0 ? { x, y, width, height: height + bubble.extraBottom, radii: bubble.radii } : null)
		);
	});

let listener: ((payload: TMessageMenuPayload | null) => void) | null = null;

export const setMessageMenuListener = (next: typeof listener) => {
	listener = next;
	return () => {
		if (listener === next) {
			listener = null;
		}
	};
};

/** False when no room screen is showing the menu: the caller falls back to the action sheet */
export const hasMessageMenu = () => !!listener;

export const showMessageMenu = (payload: TMessageMenuPayload) => listener?.(payload);
