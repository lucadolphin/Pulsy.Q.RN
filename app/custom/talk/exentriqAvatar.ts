import { useEffect, useState } from 'react';

import { avatarConfig } from './avatarConfig';

// AvatarService answers 200 with a placeholder JPEG for unknown users/rooms: the body size tells it apart
// (user/channel: 5929, group: 5796, activity: 4613 bytes)
const PLACEHOLDER_SIZES = new Set([5929, 5796, 4613]);

type TExentriqAvatarSource = { type?: string; text?: string; rid?: string };

export const getExentriqAvatarUrl = ({ type, text, rid }: TExentriqAvatarSource): string | null => {
	if (type === 'd') {
		return text ? `${avatarConfig.avatarPathUrl}${encodeURIComponent(text)}` : null;
	}
	if (!rid) return null;
	// IOS/Talk26 utilityGetRoomType
	const groupType = type === 'p' ? 'group' : type === 'c' ? 'activity' : '';
	return `${avatarConfig.groupAvatarPathUrl}${rid}&app=${avatarConfig.APP_NAME}&groupType=${groupType}`;
};

// url -> data URI, or null when the service has no picture for it
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

const blobToDataUri = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

export const fetchExentriqAvatar = (url: string): Promise<string | null> => {
	if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null);
	let request = pending.get(url);
	if (!request) {
		request = fetch(url)
			.then(async response => {
				if (!response.ok) return null;
				const blob = await response.blob();
				return PLACEHOLDER_SIZES.has(blob.size) ? null : await blobToDataUri(blob);
			})
			.then(
				result => {
					cache.set(url, result);
					return result;
				},
				// a network failure is not cached, so it is retried next time
				() => null
			)
			.finally(() => pending.delete(url));
		pending.set(url, request);
	}
	return request;
};

/** Data URI of the Exentriq picture, or null (not loaded yet / none exists): the caller keeps the letter avatar */
export const useExentriqAvatar = (source: TExentriqAvatarSource, enabled = true): string | null => {
	const url = enabled ? getExentriqAvatarUrl(source) : null;
	const [uri, setUri] = useState<string | null>(url ? (cache.get(url) ?? null) : null);

	useEffect(() => {
		if (!url) {
			setUri(null);
			return;
		}
		let active = true;
		setUri(cache.get(url) ?? null);
		fetchExentriqAvatar(url).then(result => active && setUri(result));
		return () => {
			active = false;
		};
	}, [url]);

	return uri;
};
