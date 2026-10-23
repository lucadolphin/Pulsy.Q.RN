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
