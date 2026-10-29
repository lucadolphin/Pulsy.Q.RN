export type EmaParent = { id: string; listId?: string; isMain?: boolean; closed?: boolean; archived?: boolean };

export type EmaCard = {
	_id: string;
	title: string;
	userId?: string;
	createdAt?: Date;
	parents?: EmaParent[];
	members?: { id: string; username?: string }[];
	meta?: {
		description?: string;
		eta?: Date | string;
		labels?: string[];
		color?: string;
		isBillable?: boolean;
		customerId?: number | string;
		points?: number | string;
		progress?: number | string;
		effort?: number | string;
		budget?: number | string;
		coverId?: string;
		RESPONSIBLE?: string[];
		itemsCount?: number;
		completedItemsCount?: number;
		/** Sort position of the card inside each list it belongs to, keyed by list id. */
		[listId: string]: unknown;
	};
};

/** A task list (or approval group) of a card: EMA's `entity_list`. */
export type EmaList = {
	_id: string;
	title: string;
	parents?: EmaParent[];
	meta?: { type?: string; itemsCount?: number; completedItemsCount?: number; isBacklog?: boolean; isDone?: boolean };
};

export type EmaEvent = { _id: string; title?: string; startDate?: Date | string; dueDate?: Date | string };

/** A file attached to a card (`ostrio:files` documents in EMA's `attachments`). */
export type EmaAttachment = {
	_id: string;
	name: string;
	extension?: string;
	size?: number;
	isImage?: boolean;
	isVideo?: boolean;
};

export type EmaLabel = { _id: string; title?: string; color?: string };

export type EmaUser = { _id: string; username?: string; name?: string; email?: string; emails?: { address: string }[] };

/** A task list with its tasks, open ones first in EMA's own order. */
export type EmaListWithItems = EmaList & { items: EmaCard[] };

export type EmaCardState =
	| { status: 'idle' }
	| { status: 'loading' }
	| {
			status: 'ready';
			card: EmaCard;
			canEdit: boolean;
			/** The id of the person on EMA, which differs from the id on the chat server. */
			userId: string;
			taskLists: EmaListWithItems[];
			approvalLists: EmaListWithItems[];
			labels: EmaLabel[];
			/** Every label of the board the card is in, to pick from. */
			boardLabels: EmaLabel[];
			boardId?: string;
			/** The person has an editing role on the board itself, which EMA asks for before it lets them create or change labels. */
			canManageLabels: boolean;
			events: EmaEvent[];
			attachments: EmaAttachment[];
			/** Everyone EMA published for the card (creator and members), by id. */
			users: Record<string, EmaUser>;
	  }
	| { status: 'error'; reason: 'not-found' | string };
