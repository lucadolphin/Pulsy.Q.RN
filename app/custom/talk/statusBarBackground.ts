/**
 * Color of the strip behind the status bar. That strip isn't part of any screen's header: it is the app's
 * `MediaCallHeader` (mounted once in AppContainer, an empty view with `paddingTop: insets.top` and
 * `surfaceNeutral` when there's no call). A screen that wants its own color sets it here and releases it on blur.
 */
import { useSyncExternalStore } from 'react';

let current: string | null = null;
const listeners = new Set<() => void>();

export const setStatusBarBackground = (color: string | null) => {
	if (current === color) {
		return;
	}
	current = color;
	listeners.forEach(listener => listener());
};

const claims: { color: string }[] = [];

/**
 * Claims the strip for a screen; the returned release gives it back. With several claims alive (a screen opened on
 * top of another that still holds it) the latest one shows, and the order screens blur and focus in doesn't matter.
 */
export const claimStatusBarBackground = (color: string): (() => void) => {
	const claim = { color };
	claims.push(claim);
	setStatusBarBackground(color);
	return () => {
		claims.splice(claims.indexOf(claim), 1);
		setStatusBarBackground(claims.length ? claims[claims.length - 1].color : null);
	};
};

export const getStatusBarBackground = () => current;

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useStatusBarBackground = (): string | null =>
	useSyncExternalStore(
		subscribe,
		() => current,
		() => null
	);
