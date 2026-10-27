import { useSyncExternalStore } from 'react';
import { makeMutable } from 'react-native-reanimated';

import { type IEmoji } from '~/definitions';

// IOS/Talk26 emojiStickerDrag + stickerSendBridge: an emoji of the picker dragged into the chat is sent as a sticker.
// The finger position lives in shared values, so following it never goes through React.
export const dragX = makeMutable(0);
export const dragY = makeMutable(0);
export const dragOverZone = makeMutable(false);
/** Where the overlay starts in the window: the finger coordinates are the window's */
export const overlayOriginX = makeMutable(0);
export const overlayOriginY = makeMutable(0);

type TDragState = { active: boolean; emoji: IEmoji | null };
const IDLE: TDragState = { active: false, emoji: null };
let state = IDLE;
const listeners = new Set<() => void>();

const emit = (next: TDragState) => {
	state = next;
	listeners.forEach(listener => listener());
};

export const beginStickerDrag = (emoji: IEmoji) => emit({ active: true, emoji });
export const endStickerDrag = () => {
	dragOverZone.value = false;
	emit(IDLE);
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useStickerDrag = (): TDragState => useSyncExternalStore(subscribe, () => state);

/** Where the emoji can be dropped: the chat, above the keyboard and the composer */
export const isOverChat = (y: number, screenHeight: number, topInset: number) => {
	'worklet';

	return y >= topInset + 56 && y <= Math.max(screenHeight * 0.35, screenHeight - 380);
};

/** The text of the sticker: the character of a standard emoji, `:name:` of a custom one */
export const stickerText = (emoji: IEmoji, toUnicode: (shortname: string) => string): string =>
	typeof emoji === 'string' ? toUnicode(emoji.startsWith(':') ? emoji : `:${emoji}:`) : `:${emoji.name}:`;

type TStickerSender = (text: string) => void;
let sender: TStickerSender | null = null;
let lastText = '';
let lastAt = 0;

/** The room on screen registers how a sticker is sent */
export const registerStickerSender = (next: TStickerSender | null) => {
	sender = next;
	return () => {
		if (sender === next) {
			sender = null;
		}
	};
};

export const sendSticker = (text: string): boolean => {
	const trimmed = text.trim();
	const now = Date.now();
	// A double drop of the same emoji within a moment is one sticker
	if (!trimmed || !sender || (trimmed === lastText && now - lastAt < 600)) {
		return false;
	}
	lastText = trimmed;
	lastAt = now;
	sender(trimmed);
	return true;
};
