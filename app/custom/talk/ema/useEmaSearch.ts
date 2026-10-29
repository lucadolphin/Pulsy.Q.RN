import { useEffect, useState } from 'react';

import { connectEma } from './useEmaCard';

export type EmaPerson = { id: string; name?: string; username?: string; email?: string };
export type EmaCustomerFound = { id: number | string; name: string; email?: string };

type TSearch<T> = { found: T[]; total: number; loading: boolean };

/** Runs one of EMA's `easySearch` publications, a page of `limit` at a time, and maps what the index publishes. */
const useEasySearch = <T>(collection: string, term: string, limit: number, map: (doc: any) => T): TSearch<T> => {
	const [result, setResult] = useState<TSearch<T>>({ found: [], total: 0, loading: true });

	useEffect(() => {
		let cancelled = false;
		let stop = (): void => undefined;
		let unlisten = (): void => undefined;
		setResult(current => ({ ...current, loading: true }));

		connectEma()
			.then(async ({ ema }) => {
				if (cancelled) {
					return;
				}
				const definition = JSON.stringify(term);
				const options = JSON.stringify({});
				const read = () => {
					if (cancelled) {
						return;
					}
					const docs = ema
						.find(collection, doc => doc.__searchDefinition === definition && doc.__searchOptions === options)
						.sort((a, b) => (a.__sortPosition ?? 0) - (b.__sortPosition ?? 0));
					const count = ema.findOne(collection, `searchCount${definition}`) as { count?: number } | undefined;
					const ready = ema.findOne(collection, `ready${definition}`) as { ready?: boolean } | undefined;
					const loading = !ready?.ready;
					// While the new search has not answered, the previous list stays instead of emptying and filling again
					setResult(current =>
						loading && !docs.length
							? { ...current, loading }
							: { found: docs.map(map), total: count?.count ?? docs.length, loading }
					);
				};
				unlisten = ema.onChange(read);
				const subscription = await ema.subscribe(collection, term, { limit, skip: 0, props: {} });
				stop = subscription.stop;
				read();
			})
			.catch(() => !cancelled && setResult({ found: [], total: 0, loading: false }));

		return () => {
			cancelled = true;
			unlisten();
			stop();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [collection, term, limit]);

	return result;
};

/** Searches EMA's people the way its "Add members" window does. */
export const useEmaUserSearch = (term: string, limit: number) => {
	const { found, total, loading } = useEasySearch<EmaPerson>('users/easySearch', term, limit, user => ({
		id: user.details?._id ?? user.__originalId ?? user._id,
		name: user.name ?? user.details?.name,
		username: user.username ?? user.details?.username,
		email: user.email ?? user.details?.email
	}));
	return { people: found, total, loading };
};

/** Searches EMA's customers the way its "Add customer" window does. */
export const useEmaCustomerSearch = (term: string, limit: number) => {
	const { found, total, loading } = useEasySearch<EmaCustomerFound>('customers/easySearch', term, limit, customer => ({
		id: customer.__originalId ?? customer.id ?? customer._id,
		name:
			customer.companyName ||
			[customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
			customer.title ||
			String(customer._id),
		email: customer.title
	}));
	return { customers: found, total, loading };
};

export type EmaActivity = {
	_id: string;
	userName?: string;
	time?: Date | string;
	days?: number;
	hours?: number;
	minutes?: number;
	description?: string;
};

/** The time logged on a card, followed live (`edoActivitiesForCard`). */
export const useEmaActivities = (cardId: string, enabled: boolean) => {
	const [entries, setEntries] = useState<EmaActivity[]>([]);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		let cancelled = false;
		let stop = (): void => undefined;
		let unlisten = (): void => undefined;
		connectEma()
			.then(async ({ ema }) => {
				if (cancelled) {
					return;
				}
				const read = () =>
					!cancelled &&
					setEntries(
						(ema.find('edoActivities', doc => doc.cardId === cardId) as EmaActivity[]).sort(
							(a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime()
						)
					);
				unlisten = ema.onChange(read);
				const subscription = await ema.subscribe('edoActivitiesForCard', cardId, {}, 50);
				stop = subscription.stop;
				await subscription.ready;
				read();
				setReady(true);
			})
			.catch(() => !cancelled && setReady(true));
		return () => {
			cancelled = true;
			unlisten();
			stop();
		};
	}, [cardId, enabled]);

	return { entries, ready };
};
