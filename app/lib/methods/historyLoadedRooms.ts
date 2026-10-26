import { useSyncExternalStore } from 'react';

const loaded = new Set<string>();
const listeners = new Set<() => void>();

/** The room's history was fetched from the server in this session: what the local rows show is all there is. */
export const markHistoryLoaded = (rid: string) => {
	if (loaded.has(rid)) {
		return;
	}
	loaded.add(rid);
	listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useHistoryLoaded = (rid?: string): boolean => useSyncExternalStore(subscribe, () => !!rid && loaded.has(rid));
