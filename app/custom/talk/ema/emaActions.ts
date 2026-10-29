import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import ExpoQuickLook from '@magrinj/expo-quick-look';
import { Share } from 'react-native';

import { random } from '~/lib/methods/helpers';
import sdk from '~/lib/services/sdk';
import { type EmaCard } from './types';
import { connectEma, emaBaseUrl } from './useEmaCard';

/** The lists of a board that a card could be completed into or reopened into, for the person to pick from. */
export type ListChoice = { boardId: string; boardTitle: string; lists: { _id: string; title: string }[] };

/** What the calendar form edits: a title and, optionally, a start and an end. */
export type EventFields = { title: string; startDate: Date | null; dueDate: Date | null };

const ROLE = { NORMAL: 'NORMAL', ASSIGNED: 'ASSIGNED', VISITOR: 'VISITOR', RESPONSIBLE: 'RESPONSIBLE' };

// Meteor 3 would name collection writes `/entity/updateAsync`, which EMA's Meteor 2 lacks: call the methods it has.
const update = async (collection: string, id: string, modifier: Record<string, unknown>) => {
	const { ema } = await connectEma();
	await ema.call(`/${collection}/update`, { _id: id }, modifier, {});
};

/** Sets a field of an entity, or removes it when the value is undefined. */
export const setField = (id: string, path: string, value: unknown) =>
	update('entity', id, value === undefined ? { $unset: { [path]: true } } : { $set: { [path]: value } });

/**
 * Completes or reopens an entity in the given parent, as ROMEO's checkbox does. When the board has several lists to put it in,
 * nothing changes and the answer is the choice to ask for: call again with `prefer` set to the list picked.
 */
export const setCompleted = async (
	entityId: string,
	parentId: string,
	completed: boolean,
	prefer: Record<string, string> = {}
): Promise<ListChoice | undefined> => {
	const { ema } = await connectEma();
	const result = await ema.call<{
		status?: string;
		parent?: { _id: string; title?: string };
		lists?: { _id: string; title: string }[];
	} | null>(completed ? 'closeCard' : 'reopenCard', entityId, prefer, { obj: { id: parentId } });
	if (result?.status === 'duplicate' && result.parent && result.lists) {
		return { boardId: result.parent._id, boardTitle: result.parent.title ?? '', lists: result.lists };
	}
	return undefined;
};

/** Adds a person to the card, and as its responsible when asked. They get the activity only, not the board. */
export const addMember = async (cardId: string, userId: string, responsible: boolean) => {
	const { ema } = await connectEma();
	await ema.call('Cards.addMember', {
		id: cardId,
		boardId: cardId,
		userId,
		addToBoard: false,
		permissions: [ROLE.ASSIGNED, ROLE.VISITOR, ...(responsible ? [ROLE.RESPONSIBLE] : [])]
	});
	if (responsible) {
		await update('entity', cardId, { $addToSet: { 'meta.RESPONSIBLE': userId } });
	}
};

export const removeMember = async (cardId: string, userId: string) => {
	const { ema } = await connectEma();
	await ema.call('Cards.removeMember', cardId, userId);
};

/** Takes the responsible role away from everyone who has it. */
export const removeResponsible = async (cardId: string, memberIds: string[]) => {
	const { ema } = await connectEma();
	await Promise.all(memberIds.map(memberId => ema.call('Permission.removeRole', cardId, memberId, {}, ROLE.RESPONSIBLE)));
	await update('entity', cardId, { $unset: { 'meta.RESPONSIBLE': 1 } });
};

export const addTask = async (cardId: string, listId: string, title: string, approval = false) => {
	const { ema, userId } = await connectEma();
	const id = random(17);
	await ema.call('/entity/insert', {
		_id: id,
		title,
		titleEml: title,
		userId,
		parents: [{ id: cardId, listId, isMain: true }],
		seenIds: [userId],
		meta: { [listId]: { sort: -Date.now() }, type: approval ? 'approval' : 'task' }
	});
	await ema.call('Permission.addUserWithRoles', id, userId, {}, ROLE.NORMAL);
};

/** Moves a task inside its list or into another one, at the given sort position. */
export const moveTask = async (task: EmaCard, fromListId: string, toListId: string, sort: number) => {
	const index = task.parents?.findIndex(parent => parent.listId === fromListId) ?? -1;
	if (index === -1) {
		throw new Error(`Failed to find the parent with listId ${fromListId}`);
	}
	const moved = fromListId !== toListId;
	await update('entity', task._id, {
		...(moved && { $unset: { [`meta.${fromListId}`]: true } }),
		$set: {
			[`meta.${toListId}.sort`]: sort,
			...(moved && { [`parents.${index}.listId`]: toListId, [`parents.${index}.prevListId`]: fromListId })
		}
	});
};

/** Where a task sorts when placed between two others (ROMEO's `calculateIndexForTask`). */
export const sortBetween = (previous: EmaCard | undefined, next: EmaCard | undefined, listId: string): number => {
	const sortOf = (task: EmaCard) => Number((task.meta?.[listId] as { sort?: number } | undefined)?.sort ?? 0);
	if (!previous && !next) {
		return 0;
	}
	if (!previous && next) {
		return sortOf(next) - 1;
	}
	if (previous && !next) {
		return sortOf(previous) + 1;
	}
	return (sortOf(previous as EmaCard) + sortOf(next as EmaCard)) / 2;
};

export const addList = async (cardId: string, title: string, approval = false) => {
	const { ema, userId } = await connectEma();
	await ema.call('/entity_list/insert', {
		_id: random(17),
		title,
		userId,
		createdAt: new Date(),
		parents: [{ id: cardId, isMain: true }],
		...(approval && { meta: { type: 'approval' } })
	});
};

export const renameList = (listId: string, title: string) => update('entity_list', listId, { $set: { title } });

/** Archives a list of the card; `boardId` is the board the card lives in. */
export const archiveList = async (listId: string, boardId: string) => {
	const { ema } = await connectEma();
	await ema.call('Lists.archive', listId, boardId);
};

/** Sets what a list is for: the default one new tasks go to, a done one, or neither. */
export const setListKind = (listId: string, kind: 'default' | 'done', on: boolean) =>
	update(
		'entity_list',
		listId,
		kind === 'default'
			? { $set: { 'meta.isBacklog': true }, $unset: { 'meta.isDone': true } }
			: { [on ? '$set' : '$unset']: { 'meta.isDone': true } }
	);

export const renameEntity = (entityId: string, title: string) => update('entity', entityId, { $set: { title } });

/** Archives a task or the card, inside the board it is being seen from. */
export const archiveEntity = async (entityId: string, boardId?: string) => {
	const { ema } = await connectEma();
	await ema.call('archiveCard', entityId, boardId);
};

/** The link into EMA of a task, as ROMEO copies it. */
export const getLink = async (entityId: string): Promise<string | undefined> => {
	const { ema } = await connectEma();
	const paths = await ema.call<{ main?: { link?: string }[][] } | null>('getPaths', entityId, undefined, false, true, true);
	return paths?.main?.[0]?.at(-1)?.link;
};

/** The path of the card through its boards and lists, as ROMEO's Links section lists it. */
export const getPaths = async (cardId: string): Promise<{ name: string; link?: string }[]> => {
	const { ema } = await connectEma();
	const paths = await ema.call<{ main?: { name: string; link?: string }[][] } | null>(
		'getPaths',
		cardId,
		undefined,
		false,
		true,
		true
	);
	return paths?.main?.[0] ?? [];
};

/** Puts a label on the card, or takes it off when it is already there. */
export const toggleLabel = async (cardId: string, labelId: string) => {
	const { ema } = await connectEma();
	await ema.call('toggleCardLabel', cardId, labelId);
};

export const createLabel = async (boardId: string, title: string, color: string) => {
	const { ema } = await connectEma();
	await ema.call('/labels/insert', { _id: random(17), title, color, parents: [{ id: boardId, isMain: true }] });
};

export const updateLabel = (labelId: string, title: string, color: string) =>
	update('labels', labelId, { $set: { title, color } });

export const addEvent = async (cardId: string, { title, startDate, dueDate }: EventFields) => {
	const { ema } = await connectEma();
	await ema.call('/events/insert', {
		_id: random(17),
		title,
		...(startDate && { startDate }),
		...(dueDate && { dueDate }),
		parents: [{ id: cardId, isMain: true }]
	});
};

/** Changes an event; a date left null is taken off it. */
export const updateEvent = (eventId: string, { title, startDate, dueDate }: EventFields) =>
	update('events', eventId, {
		$set: { title, ...(startDate && { startDate }), ...(dueDate && { dueDate }) },
		...((!startDate || !dueDate) && { $unset: { ...(!startDate && { startDate: true }), ...(!dueDate && { dueDate: true }) } })
	});

export const removeEvent = async (eventId: string) => {
	const { ema } = await connectEma();
	await ema.call('/events/remove', { _id: eventId });
};

/** Uses an image as the card's cover, or clears the cover. */
export const setCover = (cardId: string, attachmentId: string | undefined) =>
	update('entity', cardId, attachmentId ? { $set: { 'meta.coverId': attachmentId } } : { $unset: { 'meta.coverId': true } });

export const removeAttachment = async (attachmentId: string) => {
	const { ema } = await connectEma();
	await ema.call('/attachments/remove', { _id: attachmentId });
};

/** Where a file of the card can be downloaded from. */
export const attachmentUrl = ({ _id, extension }: { _id: string; extension?: string }): string | undefined => {
	const url = emaBaseUrl();
	return url && `${url.replace(/\/$/, '')}/cdn/storage/attachments/${_id}/original/${_id}${extension ? `.${extension}` : ''}`;
};

/** Uploads a local file to the card the way ROMEO's drop zone does, in chunks over DDP. */
export const uploadFile = async (cardId: string, file: { uri: string; name: string; type: string; size: number }) => {
	const { ema } = await connectEma();
	const fileId = random(17);
	// Multiples of 3 bytes, so every chunk encodes to base64 without padding.
	const chunkSize = Math.max(3, Math.floor(Math.min(Math.max(file.size / 1000, 327680), 1048576) / 3) * 3);
	const fileLength = Math.max(1, Math.ceil(file.size / chunkSize));
	await ema.call('_FilesCollectionStart_attachments', {
		file: { size: file.size, type: file.type, name: file.name, meta: { cardId } },
		fileId,
		chunkSize,
		fileLength
	});
	const handle = new File(file.uri).open();
	try {
		for (let chunkId = 1; chunkId <= fileLength; chunkId += 1) {
			const bytes = handle.readBytes(chunkSize);
			let binary = '';
			bytes.forEach(byte => {
				binary += String.fromCharCode(byte);
			});
			// eslint-disable-next-line no-await-in-loop
			await ema.call('_FilesCollectionWrite_attachments', { fileId, binData: btoa(binary), chunkId });
		}
	} finally {
		handle.close();
	}
	await ema.call('_FilesCollectionWrite_attachments', { eof: true, fileId });
};

/** Logs time on the card from a line like "1d 4h 10m for the activity". Answers with the reason it failed, or nothing. */
const SECONDS = { d: 8 * 3600, h: 3600, m: 60 };
export const parseActivityLine = (line: string): { seconds: number; description: string } | undefined => {
	const match = /^\s*((?:\d+\s*[dhm]\s*)+)(?:for\s+)?(.*)$/i.exec(line);
	if (!match) {
		return undefined;
	}
	let seconds = 0;
	for (const [, amount, unit] of match[1].matchAll(/(\d+)\s*([dhm])/gi)) {
		seconds += Number(amount) * SECONDS[unit.toLowerCase() as 'd' | 'h' | 'm'];
	}
	return seconds > 0 ? { seconds, description: match[2].trim() } : undefined;
};

export const addActivity = async (cardId: string, boardId: string | undefined, line: string) => {
	const parsed = parseActivityLine(line);
	if (!parsed) {
		throw new Error('Type something like: 1d 4h 10m for the activity');
	}
	const { ema, userId } = await connectEma();
	await ema.call('addActivityEml', {
		userId,
		eml: {
			entities: [...(boardId ? [boardId] : []), cardId],
			clean: parsed.description,
			value: line.trim(),
			statement: line.trim(),
			seconds: parsed.seconds
		}
	});
};

export const getActivitiesTotal = async (cardId: string): Promise<string> => {
	const { ema } = await connectEma();
	return String((await ema.call('getActivitiesTotalTimeForCard', {}, cardId)) ?? '');
};

/** The customer's display name, resolved on EMA as ROMEO does (`getCustomerFromId`). */
export const getCustomerName = async (customerId: number | string): Promise<string | undefined> => {
	const { ema } = await connectEma();
	const sessionToken = await sdk.methodCall('exentriq.getSessionToken');
	const customer = await ema.call<{ label?: string; companyName?: string; firstname?: string; contact?: string } | null>(
		'getCustomerFromId',
		customerId,
		sessionToken
	);
	return customer ? customer.label || customer.companyName || customer.firstname || customer.contact : undefined;
};

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_');

/** Downloads an attachment of the card to the app's cache and answers with its local path. */
export const downloadAttachment = async (attachment: { _id: string; name: string; extension?: string }): Promise<string> => {
	const url = attachmentUrl(attachment);
	if (!url) {
		throw new Error('error-ema-not-configured');
	}
	const file = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}${safeName(attachment.name)}`);
	return file.uri;
};

/** Hands the file to the system share sheet, where it can be saved to Files or sent elsewhere. */
export const shareAttachment = async (attachment: { _id: string; name: string; extension?: string }) => {
	const uri = await downloadAttachment(attachment);
	await Share.share({ url: uri, message: attachment.name });
};

/** Opens a file that is neither an image nor a video in the system's preview (Quick Look). */
export const previewAttachmentFile = async (attachment: { _id: string; name: string; extension?: string }) => {
	const uri = await downloadAttachment(attachment);
	await ExpoQuickLook.previewFile({ uri, editingMode: 'createCopy' });
};
