import EJSON from 'ejson';

type TDoc = Record<string, any> & { _id: string };
type TListener = () => void;

type TPending = { resolve: (value: any) => void; reject: (error: Error) => void };

/**
 * A small DDP client for EMA, the Meteor app behind the Exentriq cards. The app already speaks DDP to the chat server
 * through the Rocket.Chat SDK; EMA is a second, unrelated server, so it gets a session of its own that only keeps
 * the collections it is subscribed to.
 */
export class EmaDdp {
	private ws?: WebSocket;

	private nextId = 1;

	private pending = new Map<string, TPending>();

	private readyHandlers = new Map<string, () => void>();

	private collections = new Map<string, Map<string, TDoc>>();

	private listeners = new Set<TListener>();

	private opened?: Promise<void>;

	private closed = false;

	/** Called once when the socket closes: the session is gone with it (login and subscriptions), so the owner opens a new one. */
	onClosed?: () => void;

	constructor(private readonly url: string) {}

	private get endpoint(): string {
		return `${this.url.replace(/^http/, 'ws').replace(/\/$/, '')}/websocket`;
	}

	private send(message: Record<string, unknown>): void {
		this.ws?.send(EJSON.stringify(message));
	}

	connect(): Promise<void> {
		if (this.closed) {
			return Promise.reject(new Error('error-ema-closed'));
		}
		if (!this.opened) {
			this.opened = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(this.endpoint);
				this.ws = ws;
				ws.onopen = () => this.send({ msg: 'connect', version: '1', support: ['1'] });
				ws.onerror = () => reject(new Error('error-ema-unreachable'));
				ws.onclose = () => {
					this.closed = true;
					this.opened = undefined;
					this.onClosed?.();
					this.pending.forEach(({ reject: fail }) => fail(new Error('error-ema-closed')));
					this.pending.clear();
				};
				ws.onmessage = event => {
					const message = EJSON.parse(String(event.data));
					if (message.msg === 'connected') {
						resolve();
					}
					this.handle(message);
				};
			});
			this.opened.catch(() => {
				this.opened = undefined;
				this.closed = true;
			});
		}
		return this.opened;
	}

	private handle(message: any): void {
		switch (message.msg) {
			case 'ping':
				this.send({ msg: 'pong', ...(message.id ? { id: message.id } : {}) });
				break;
			case 'result': {
				const call = this.pending.get(message.id);
				this.pending.delete(message.id);
				if (call) {
					if (message.error) {
						call.reject(new Error(message.error.reason || message.error.message || 'error-ema-method'));
					} else {
						call.resolve(message.result);
					}
				}
				break;
			}
			case 'ready':
				(message.subs as string[]).forEach(id => this.readyHandlers.get(id)?.());
				break;
			case 'added':
				this.collection(message.collection).set(message.id, { _id: message.id, ...message.fields });
				this.notify();
				break;
			case 'changed': {
				const docs = this.collection(message.collection);
				const doc = { ...(docs.get(message.id) ?? { _id: message.id }), ...message.fields };
				(message.cleared ?? []).forEach((key: string) => delete doc[key]);
				docs.set(message.id, doc);
				this.notify();
				break;
			}
			case 'removed':
				this.collection(message.collection).delete(message.id);
				this.notify();
				break;
			default:
		}
	}

	private collection(name: string): Map<string, TDoc> {
		let docs = this.collections.get(name);
		if (!docs) {
			docs = new Map();
			this.collections.set(name, docs);
		}
		return docs;
	}

	private notify(): void {
		this.listeners.forEach(listener => listener());
	}

	/** Called after the collections change, to read them again. */
	onChange(listener: TListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async call<T = any>(method: string, ...params: unknown[]): Promise<T> {
		await this.connect();
		return new Promise<T>((resolve, reject) => {
			const id = String(this.nextId++);
			this.pending.set(id, { resolve, reject });
			this.send({ msg: 'method', method, params, id });
		});
	}

	/** Subscribes and resolves when the server has sent the initial data; `stop` ends it. */
	async subscribe(name: string, ...params: unknown[]): Promise<{ ready: Promise<void>; stop: () => void }> {
		await this.connect();
		const id = String(this.nextId++);
		const ready = new Promise<void>(resolve => this.readyHandlers.set(id, resolve));
		this.send({ msg: 'sub', id, name, params });
		return {
			ready,
			stop: () => {
				this.readyHandlers.delete(id);
				this.send({ msg: 'unsub', id });
			}
		};
	}

	find(collection: string, predicate: (doc: TDoc) => boolean = () => true): TDoc[] {
		return [...this.collection(collection).values()].filter(predicate);
	}

	findOne(collection: string, id: string): TDoc | undefined {
		return this.collection(collection).get(id);
	}

	/** Signs in with the Exentriq session token (verifyToken, then login by the resume token it returns). */
	async loginWithSessionToken(sessionToken: string): Promise<string> {
		const verified = await this.call<{ loginToken?: string; _id?: string } | null>('verifyToken', sessionToken);
		if (!verified?.loginToken || !verified._id) {
			throw new Error('error-exentriq-token-refused');
		}
		await this.call('login', { resume: verified.loginToken });
		return verified._id;
	}

	close(): void {
		this.listeners.clear();
		this.ws?.close();
	}
}
