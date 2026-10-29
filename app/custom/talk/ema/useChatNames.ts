import { useEffect, useState } from 'react';

import sdk from '~/lib/services/sdk';

const cache = new Map<string, string | null>();

/** Real names by username, from the chat server, for the people EMA publishes with a username only. */
export const useChatNames = (usernames: string[]): Record<string, string> => {
	const [, setVersion] = useState(0);
	const key = usernames.join(',');

	useEffect(() => {
		let cancelled = false;
		usernames
			.filter(username => username && !cache.has(username))
			.forEach(username => {
				cache.set(username, null);
				sdk.get('users.info' as any, { username } as any).then(
					(result: any) => {
						cache.set(username, result?.user?.name ?? null);
						if (!cancelled) {
							setVersion(version => version + 1);
						}
					},
					() => undefined
				);
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	return Object.fromEntries(
		usernames.flatMap(username => (cache.get(username) ? [[username, cache.get(username) as string]] : []))
	);
};
