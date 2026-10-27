import { store as reduxStore } from '../store/auxStore';
import sdk from '../services/sdk';
import log from './helpers/log';
import { type IMessage } from '~/definitions';

// Older messages were received long ago, by this or another device: only the recent ones are worth an ack
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_BATCH = 30;
const acked = new Set<string>();

type TReceivable = Partial<Pick<IMessage, '_id' | 'u' | 'ts' | 't' | 'received' | 'tmid'>>;

/**
 * Tells the server that this device has the messages of other users, which the sender shows as the second tick
 * (ROMEO's setMessageReceived). Only messages not acked yet, from someone else, not older than a week.
 */
export default function markMessagesReceived(messages: TReceivable[]): void {
	const userId = reduxStore?.getState?.()?.login?.user?.id;
	if (!userId) {
		return;
	}
	const oldest = Date.now() - MAX_AGE_MS;
	messages
		.filter(
			m =>
				m._id &&
				(!m.t || m.t === 'sticker') &&
				m.u?._id &&
				m.u._id !== userId &&
				!acked.has(m._id) &&
				!m.received?.some(entry => entry._id === userId) &&
				(!m.ts || new Date(m.ts).getTime() > oldest)
		)
		.slice(-MAX_PER_BATCH)
		.forEach(m => {
			acked.add(m._id as string);
			sdk.methodCallWrapper('setMessageReceived', m._id).catch(e => {
				// Retried the next time the message comes in
				acked.delete(m._id as string);
				log(e);
			});
		});
}
