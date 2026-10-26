import { type RefObject } from 'react';
import { type View } from 'react-native';

import { type TActionSheetOptionsItem } from '~/containers/ActionSheet';

export type TMessageAnchor = { x: number; y: number; width: number; height: number };

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

const bubbles = new Map<string, RefObject<View | null>>();

/** The bubble of a message, registered by its row so the menu can sit over it */
export const registerBubble = (messageId: string, ref: RefObject<View | null>) => {
	bubbles.set(messageId, ref);
	return () => {
		if (bubbles.get(messageId) === ref) {
			bubbles.delete(messageId);
		}
	};
};

export const measureBubble = (messageId: string): Promise<TMessageAnchor | null> =>
	new Promise(resolve => {
		const view = bubbles.get(messageId)?.current;
		if (!view) {
			resolve(null);
			return;
		}
		view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
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
