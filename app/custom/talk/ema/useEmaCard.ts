import { useEffect, useState } from 'react';

import sdk from '~/lib/services/sdk';
import { EmaDdp } from './emaDdp';
import { type EmaCardState, type EmaCard, type EmaList, type EmaListWithItems, type EmaUser } from './types';

/** The roles that let a person change a card in EMA (`Permission.hasEditRoles`). */
const EDIT_ROLES = ['ADMIN', 'NORMAL', 'ASSIGNED'];

/** The root of every card's parents is not an entity: it has no roles to read. */
const ROOT = 'root';

let shared: { url: string; ready: Promise<{ ema: EmaDdp; userId: string }> } | undefined;

export const getEmaUrl = async (): Promise<string> => {
	const result = await sdk.get('settings.public' as any, { _id: 'Exentriq_EMA_Url' } as any);
	return ((result as any)?.settings?.[0]?.value as string | undefined) ?? '';
};

/** The EMA address once a session is open, for building file links. */
export const emaBaseUrl = (): string | undefined => shared?.url;

/** One EMA session for the whole app: later callers share it and a failed attempt is retried by the next one. */
export const connectEma = (): Promise<{ ema: EmaDdp; userId: string }> => {
	const ready = (async () => {
		const url = await getEmaUrl();
		if (!url) {
			throw new Error('error-ema-not-configured');
		}
		if (shared?.url === url) {
			return shared.ready;
		}
		const open = (async () => {
			const sessionToken = await sdk.methodCall('exentriq.getSessionToken');
			if (!sessionToken) {
				throw new Error('error-exentriq-no-session');
			}
			const ema = new EmaDdp(url);
			try {
				const userId = await ema.loginWithSessionToken(sessionToken);
				return { ema, userId };
			} catch (error) {
				ema.close();
				throw error;
			}
		})();
		shared = { url, ready: open };
		open.catch(() => {
			if (shared?.ready === open) {
				shared = undefined;
			}
		});
		return open;
	})();
	return ready;
};

const sortIndex = (item: EmaCard, listId: string): number =>
	Number((item.meta?.[listId] as { sort?: number } | undefined)?.sort ?? 0);

/** Follows one EMA card live through the `detailCard` publication ROMEO's detail page uses, with whether the person may edit it. */
export const useEmaCard = (cardId: string | undefined): EmaCardState => {
	const [state, setState] = useState<EmaCardState>({ status: 'idle' });

	useEffect(() => {
		if (!cardId) {
			setState({ status: 'idle' });
			return;
		}

		let cancelled = false;
		let cleanup = (): void => undefined;
		setState({ status: 'loading' });

		connectEma()
			.then(async ({ ema, userId }) => {
				if (cancelled) {
					return;
				}
				const stops: (() => void)[] = [];
				const opened = new Set<string>();
				const open = (key: string, name: string, ...params: unknown[]) => {
					if (opened.has(key)) {
						return;
					}
					opened.add(key);
					ema.subscribe(name, ...params).then(subscription => {
						if (cancelled) {
							subscription.stop();
						} else {
							stops.push(subscription.stop);
						}
					});
				};

				let cardReady = false;
				const compute = () => {
					if (cancelled) {
						return;
					}
					const card = ema.findOne('entity', cardId) as EmaCard | undefined;
					if (!card) {
						if (cardReady) {
							setState({ status: 'error', reason: 'not-found' });
						}
						return;
					}
					const parentIds = (card.parents ?? []).map(parent => parent.id).filter(id => id !== ROOT);
					const boardId = card.parents?.find(parent => parent.isMain)?.id;

					// Roles flow down from the board and project above a card: a higher role there is enough to edit it.
					const entityIds = [cardId, ...parentIds];
					entityIds.forEach(id => open(`roles:${id}`, 'entityRoles', id));
					const roles = ema
						.find('permissions', p => entityIds.includes(p.id) && p.userId === userId)
						.flatMap(permission => (permission.roles as string[] | undefined) ?? []);

					if (boardId) {
						open(`labels:${boardId}`, 'labels', boardId);
					}

					const lists = ema.find('entity_list', list =>
						(list.parents ?? []).some((parent: { id: string }) => parent.id === cardId)
					) as EmaList[];
					const withItems = lists.map((list): EmaListWithItems => {
						open(`list:${list._id}`, 'cardsForChecklist', list._id, false);
						const items = (
							ema.find('entity', item =>
								(item.parents ?? []).some(
									(parent: { listId?: string; archived?: boolean }) => parent.listId === list._id && !parent.archived
								)
							) as EmaCard[]
						).sort((a, b) => sortIndex(a, list._id) - sortIndex(b, list._id));
						return { ...list, items };
					});

					const userIds = [card.userId, ...(card.members ?? []).map(member => member.id)].filter((id): id is string => !!id);
					// The detail publication follows the members with a delay: ask for their usernames too, so avatars do not wait.
					open(`users:${userIds.join(',')}`, 'usersForIds', userIds);

					const labelIds = (card.meta?.labels as string[] | undefined) ?? [];
					const boardRoles = boardId
						? ema
								.find('permissions', p => p.id === boardId && p.userId === userId)
								.flatMap(permission => (permission.roles as string[] | undefined) ?? [])
						: [];
					setState({
						status: 'ready',
						card,
						canEdit: roles.some(role => EDIT_ROLES.includes(role)),
						userId,
						taskLists: withItems.filter(list => list.meta?.type !== 'approval'),
						approvalLists: withItems.filter(list => list.meta?.type === 'approval'),
						labels: ema.find('labels', label => labelIds.includes(label._id)) as any,
						boardLabels: boardId
							? (ema.find('labels', label =>
									(label.parents ?? []).some(
										(parent: { id: string; archived?: boolean }) => parent.id === boardId && !parent.archived
									)
								) as any)
							: [],
						boardId,
						canManageLabels: boardRoles.some(role => EDIT_ROLES.includes(role)),
						events: ema.find('events', event =>
							(event.parents ?? []).some((parent: { id: string }) => parent.id === cardId)
						) as any,
						attachments: ema.find('attachments', attachment => attachment.meta?.cardId === cardId) as any,
						users: Object.fromEntries(
							ema.find('users', user => userIds.includes(user._id)).map(user => [user._id, user as EmaUser])
						)
					});
				};

				const stopChange = ema.onChange(compute);
				cleanup = () => {
					stopChange();
					stops.forEach(stop => stop());
				};

				const detail = await ema.subscribe('detailCard', cardId);
				stops.push(detail.stop);
				await detail.ready;
				cardReady = true;
				compute();
			})
			.catch((error: Error) => {
				if (!cancelled) {
					setState({ status: 'error', reason: error.message });
				}
			});

		return () => {
			cancelled = true;
			cleanup();
		};
	}, [cardId]);

	return state;
};
