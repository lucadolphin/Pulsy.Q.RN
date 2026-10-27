/**
 * Turns the ROMEO messages copied into a Rocket.Chat database (`romeo_rc_staging`, or the `rocketchat` one served by
 * Pulsy.Q) into messages Rocket.Chat understands. See docs/romeo-messages-migration.md for the data behind each step.
 *
 *  - author: `u.username`/`u.name` rebuilt from `u._id` (the stored username is often an old one)
 *  - text: `msgInner` fills an empty `msg`, mentions `@"Name"` become `@username`, ends trimmed, empty bubbles hidden
 *  - replies and forwards (`message`, `reply`, `forwarded`) become a quote attachment
 *  - attachments: the "File Uploaded: " prefix of the titles is dropped
 *  - meet invites: one message per call, converted to `videoconf` and tied to its `rocketchat_video_conference` record
 *  - locations (`mapsGeoLocation`) become a map link, HTML news (`H`) become text, `rc` messages are hidden
 *  - read receipts: `read[]` fills `rocketchat_read_receipts` and the `unread` flag behind the blue ticks
 *  - rooms flagged `encrypted` without any encrypted message are cleared (set ENCRYPTED_ROOMS=keep to leave them)
 *  - messages of rooms that do not exist, duplicated meet invites and messages every member cleared are removed
 *
 * Idempotent: a second run finds nothing to do. Everything it deletes or overwrites in rooms is copied first into
 * `romeo_migration_backup` (documents of messages and rooms, keyed `<collection>:<_id>:<reason>`).
 * ROMEO-only fields (received, cleared, meta, ...) stay; the ones that confuse Rocket.Chat (msgInner, emlData, lm, ...) go.
 *
 *   DRY_RUN=1            only counts, writes nothing
 *   ENCRYPTED_ROOMS      'clear' (default) or 'keep'
 *
 *   DRY_RUN=1 mongosh mongodb://127.0.0.1:27017/romeo_rc_staging scripts/romeo-staging-messages.js
 *
 * Run order: this script, then romeo-staging-attachments.js, then romeo-staging-migrate.js (it recomputes the last
 * messages of the rooms after the deletions made here).
 */
const DRY_RUN = !!process.env.DRY_RUN;
const ENCRYPTED_ROOMS = process.env.ENCRYPTED_ROOMS || 'clear';
const BATCH = 1000;
const now = new Date();

const messages = db.rocketchat_message;
const backup = db.romeo_migration_backup;
const stats = {};
const count = (key, n = 1) => {
	stats[key] = (stats[key] || 0) + n;
};

/** Writes the documents to the backup collection before anything is deleted or overwritten */
const archive = (collection, docs, reason) => {
	if (DRY_RUN || !docs.length) return;
	for (let i = 0; i < docs.length; i += BATCH) {
		backup.bulkWrite(
			docs.slice(i, i + BATCH).map(doc => ({
				replaceOne: {
					filter: { _id: `${collection}:${doc._id}:${reason}` },
					replacement: { collection, reason, archivedAt: now, doc },
					upsert: true
				}
			})),
			{ ordered: false }
		);
	}
};

// ---------------------------------------------------------------- lookups

const siteUrl = String((db.rocketchat_settings.findOne({ _id: 'Site_Url' }) || {}).value || 'http://localhost:3100').replace(/\/$/, '');

// Without a name the bubble would show the username, which is an email address for many ROMEO users
const displayName = u =>
	u.name ||
	String(u.username || '')
		.split('@')[0]
		.replace(/[._-]+/g, ' ')
		.replace(/\b\w/g, c => c.toUpperCase())
		.trim() ||
	u.username;
const users = {};
db.users.find({}, { username: 1, name: 1 }).forEach(u => {
	users[u._id] = { username: u.username, name: displayName(u) };
});

const rooms = {};
db.rocketchat_room.find({}, { t: 1, name: 1, fname: 1 }).forEach(r => {
	rooms[r._id] = r;
});
const roomPath = rid => {
	const r = rooms[rid];
	if (!r) return null;
	return r.t === 'd' ? `direct/${rid}` : `${r.t === 'p' ? 'group' : 'channel'}/${encodeURIComponent(r.name || rid)}`;
};

const members = {};
db.rocketchat_subscription.find({}, { rid: 1, 'u._id': 1 }).forEach(s => {
	(members[s.rid] = members[s.rid] || new Set()).add(s.u._id);
});

const conferences = {};
db.rocketchat_video_conference.find({}, { title: 1, messages: 1 }).forEach(c => {
	conferences[c._id] = c;
});

// ---------------------------------------------------------------- messages to delete

// A meet call has one invite per invited user: the first one stays. A message cleared by every member of its room has no reader left.
const drop = new Map();
const firstInvite = {};
messages
	.find({}, { rid: 1, t: 1, meetRoomId: 1, cleared: 1 })
	.sort({ ts: 1, _id: 1 })
	.forEach(m => {
		if (!rooms[m.rid]) return void drop.set(m._id, 'orphan');
		const everyone = members[m.rid];
		if (m.cleared && everyone && everyone.size && [...everyone].every(id => m.cleared[id])) return void drop.set(m._id, 'cleared-by-all');
		if (m.t === 'meet' && m.meetRoomId) {
			const key = `${m.rid}:${m.meetRoomId}`;
			if (!firstInvite[key]) firstInvite[key] = m._id;
			else drop.set(m._id, 'duplicate-meet-invite');
		}
	});
const dropIds = [...drop.keys()];
for (let i = 0; i < dropIds.length; i += BATCH) {
	const ids = dropIds.slice(i, i + BATCH);
	const docs = messages.find({ _id: { $in: ids } }).toArray();
	docs.forEach(doc => count(`deleted ${drop.get(doc._id)}`));
	archive('rocketchat_message', docs, 'deleted');
	if (!DRY_RUN) messages.deleteMany({ _id: { $in: ids } });
}

// ---------------------------------------------------------------- per message

const HTML_ENTITIES = [
	[/&nbsp;/g, ' '],
	[/&lt;/g, '<'],
	[/&gt;/g, '>'],
	[/&quot;/g, '"'],
	[/&#39;/g, "'"],
	[/&amp;/g, '&']
];
const htmlToText = html =>
	HTML_ENTITIES.reduce(
		(text, [pattern, to]) => text.replace(pattern, to),
		html
			.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
				const label = inner.replace(/<[^>]+>/g, '').trim();
				return label && label !== href ? `[${label}](${href})` : href;
			})
			.replace(/<\/(div|p|h\d|li|blockquote)>|<br\s*\/?>/gi, '\n')
			.replace(/<[^>]+>/g, '')
	)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

// ROMEO keeps the text with placeholders in `msgInner`: {@userId} for a mention, {#id} for an entity
const resolveInner = inner =>
	inner
		.replace(/\{@([A-Za-z0-9]+)\}/g, (_, id) => (users[id] ? `@${users[id].username}` : ''))
		.replace(/\{#\d+\}/g, '')
		.trim();

/** ROMEO writes mentions as @"Full Name"; Rocket.Chat wants @username */
const replaceMentions = (msg, mentions) => {
	const found = msg.match(/@"[^"]+"/g) || [];
	let i = 0;
	return msg.replace(/@"([^"]+)"/g, (whole, name) => {
		const byName = mentions.find(x => users[x._id] && users[x._id].name === name);
		const mention = byName || (found.length === mentions.length ? mentions[i] : null);
		i++;
		return mention && users[mention._id] ? `@${users[mention._id].username}` : whole;
	});
};

const cleanTitles = attachments =>
	attachments.map(a => (a.title && a.title.startsWith('File Uploaded: ') ? { ...a, title: a.title.slice('File Uploaded: '.length) } : a));

/** The embedded original of a reply/forward as the quote attachment Rocket.Chat shows */
const quoteOf = (original, rid) => {
	const author = users[original.u && original.u._id];
	const username = author ? author.username : original.u && original.u.username;
	const path = roomPath(original.rid || rid);
	const quote = {
		text: original.msg || '',
		...(path && { message_link: `${siteUrl}/${path}?msg=${original._id}` }),
		author_name: author ? author.name : (original.u && (original.u.name || original.u.username)) || '',
		author_icon: `/avatar/${encodeURIComponent(username || '')}`,
		attachments: cleanTitles(original.attachments || []),
		ts: original.ts
	};
	return quote.text || quote.attachments.length ? quote : null;
};

const ROMEO_FIELDS = ['msgInner', 'emlData', 'prevTs', 'tId', 'noPush', 'lm'];
const SYSTEM_FREE_TYPES = [undefined, 'sticker', 'videoconf'];

let ops = [];
let receipts = [];
let conferenceOps = [];
let touched = 0;
const flush = () => {
	if (!DRY_RUN) {
		if (ops.length) messages.bulkWrite(ops, { ordered: false });
		if (receipts.length) db.rocketchat_read_receipts.bulkWrite(receipts, { ordered: false });
		if (conferenceOps.length) db.rocketchat_video_conference.bulkWrite(conferenceOps, { ordered: false });
	}
	touched += ops.length;
	ops = [];
	receipts = [];
	conferenceOps = [];
};

messages.find({}).forEach(m => {
	if (drop.has(m._id)) return;
	const $set = {};
	const $unset = {};
	const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
	const put = (field, value) => {
		if (!same(m[field], value)) $set[field] = value;
	};
	let t = m.t;
	let msg = typeof m.msg === 'string' ? m.msg : '';
	let attachments = Array.isArray(m.attachments) ? m.attachments : [];

	// author, from the user record: the name stored in the message is often an old one
	const author = m.u && users[m.u._id];
	if (author) {
		if (m.u.username !== author.username) $set['u.username'] = author.username;
		if (m.u.name !== author.name) $set['u.name'] = author.name;
	}

	// text
	if (!msg.trim() && m.msgInner && !t) msg = resolveInner(String(m.msgInner));
	if (m.mentions && m.mentions.length && msg.includes('@"')) msg = replaceMentions(msg, m.mentions);
	if (m.geoLocation && m.geoLocation.latitude !== undefined && (t === 'mapsGeoLocation' || msg === 'maps__geoLocation')) {
		const url = `https://www.google.com/maps/search/?api=1&query=${m.geoLocation.latitude},${m.geoLocation.longitude}`;
		msg = `📍 ${url}`;
		put('urls', [{ url }]);
		count('locations');
	}
	if (t === 'mapsGeoLocation') {
		$unset.t = '';
		t = undefined;
	}
	if (t === 'H') {
		msg = htmlToText(msg);
		$unset.t = '';
		t = undefined;
		count('news converted');
	}
	msg = msg.trim();
	put('msg', msg);

	// mentions: the shape the clients read
	if (m.mentions && m.mentions.length) {
		put(
			'mentions',
			m.mentions.map(x => (users[x._id] ? { _id: x._id, username: users[x._id].username, name: users[x._id].name, type: 'user' } : x))
		);
	}

	// replies and forwards: the quoted original as an attachment
	if (m.message && typeof m.message === 'object' && m.message._id) {
		const quote = quoteOf(m.message, m.rid);
		if (quote && !attachments.some(a => a.message_link === quote.message_link && a.text === quote.text)) {
			attachments = [...attachments, quote];
			count(m.forwarded ? 'forwards quoted' : 'replies quoted');
		}
	}
	['message', 'reply', 'forwarded'].forEach(field => {
		if (m[field] !== undefined) $unset[field] = '';
	});

	// attachments: titles
	const cleaned = cleanTitles(attachments);
	if (!same(cleaned, m.attachments || []) && cleaned.length) $set.attachments = cleaned;
	attachments = cleaned;

	// meet invite -> video conference message, only when the call record exists
	if (t === 'meet' && m.meetRoomId && firstInvite[`${m.rid}:${m.meetRoomId}`] === m._id && conferences[m.meetRoomId]) {
		const conference = conferences[m.meetRoomId];
		$set.t = 'videoconf';
		$set.msg = conference.title || 'Video Conference';
		$set.groupable = false;
		$set.blocks = [{ type: 'video_conf', blockId: m.meetRoomId, callId: m.meetRoomId, appId: 'videoconf-core' }];
		['for', 'meetRoomId', 'meetMessage', 'meet', 'urls'].forEach(field => {
			if (m[field] !== undefined) $unset[field] = '';
		});
		t = 'videoconf';
		msg = $set.msg;
		if (!conference.messages || conference.messages.started !== m._id) {
			conferenceOps.push({ updateOne: { filter: { _id: conference._id }, update: { $set: { 'messages.started': m._id } } } });
		}
		count('meet invites converted');
	}

	// ROMEO fields that Rocket.Chat reads wrongly (`lm` marks a thread parent there) or never
	ROMEO_FIELDS.forEach(field => {
		if (m[field] !== undefined) $unset[field] = '';
	});

	// bubbles with nothing to show, and the "group created" notices Rocket.Chat has no type for
	if (!m._hidden) {
		const empty = !msg && !m.file && !attachments.length && !t && !m.blocks;
		if (empty || t === 'rc') {
			$set._hidden = true;
			count(t === 'rc' ? 'room-created notices hidden' : 'empty messages hidden');
		}
	}

	// read state: the blue ticks read `unread`, the "read by" list reads the receipts
	if (SYSTEM_FREE_TYPES.includes(t) && m.u) {
		const readers = [...new Set((m.read || []).filter(r => r._id !== m.u._id).map(r => r._id))];
		const everyone = members[m.rid] ? members[m.rid].size - 1 : 1;
		const unread = readers.length < Math.max(everyone, 1);
		if (m.unread !== unread) $set.unread = unread;
		(m.read || []).forEach(r => {
			if (r._id === m.u._id) return;
			receipts.push({
				updateOne: {
					filter: { _id: m._id + r._id },
					update: { $setOnInsert: { roomId: m.rid, userId: r._id, messageId: m._id, ts: r.ts, _updatedAt: now } },
					upsert: true
				}
			});
		});
	}

	if (Object.keys($set).length || Object.keys($unset).length) {
		const update = {};
		if (Object.keys($set).length) update.$set = { ...$set, _updatedAt: now };
		if (Object.keys($unset).length) update.$unset = $unset;
		ops.push({ updateOne: { filter: { _id: m._id }, update } });
	}
	if (ops.length >= BATCH || receipts.length >= BATCH) flush();
});
flush();

// ---------------------------------------------------------------- rooms flagged encrypted, with plain history and no keys

if (ENCRYPTED_ROOMS === 'clear') {
	const encryptedMessageRooms = messages.distinct('rid', { t: 'e2e' });
	const ids = db.rocketchat_room.distinct('_id', { encrypted: true, _id: { $nin: encryptedMessageRooms } });
	archive('rocketchat_room', db.rocketchat_room.find({ _id: { $in: ids } }, { encrypted: 1, e2eKeyId: 1 }).toArray(), 'encryption-cleared');
	if (!DRY_RUN && ids.length) {
		db.rocketchat_room.updateMany({ _id: { $in: ids } }, { $unset: { encrypted: '', e2eKeyId: '' }, $set: { _updatedAt: now } });
		db.rocketchat_subscription.updateMany({ rid: { $in: ids }, encrypted: true }, { $unset: { encrypted: '' }, $set: { _updatedAt: now } });
	}
	count('rooms with encryption cleared', ids.length);
}

// ---------------------------------------------------------------- read receipt settings

if (!DRY_RUN) {
	['Message_Read_Receipt_Enabled', 'Message_Read_Receipt_Store_Users'].forEach(_id =>
		db.rocketchat_settings.updateOne({ _id }, { $set: { value: true, _updatedAt: new Date() } })
	);
}

stats[`messages ${DRY_RUN ? 'that would be updated' : 'updated'}`] = touched;
print(`${DRY_RUN ? 'DRY RUN, nothing written. ' : ''}messages left: ${messages.countDocuments({})}`);
Object.keys(stats)
	.sort()
	.forEach(key => print(`  ${key}: ${stats[key]}`));
print('next: romeo-staging-attachments.js, then romeo-staging-migrate.js');
