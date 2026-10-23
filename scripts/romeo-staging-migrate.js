/**
 * Adds the fields Rocket.Chat needs to the ROMEO collections copied into `romeo_rc_staging`
 * (users, rocketchat_room, rocketchat_subscription, rocketchat_message). Idempotent: every field is only
 * set when it is missing (except `lm`/`lastMessage` of the rooms, recomputed from the messages).
 * ROMEO-only fields (exUpdatedAt, msgInner, meet*, ...) are left as they are: Rocket.Chat ignores them.
 * Plain JS on purpose: ROMEO's Mongo (3.6) has no pipeline updates; this runs on any version.
 *
 *   mongosh mongodb://127.0.0.1:27017/romeo_rc_staging scripts/romeo-staging-migrate.js
 */
const now = new Date();
const BATCH = 1000;

/** Applies `build(doc)` ($set document, or null to skip) to every document of `collection`, in batches. */
const migrate = (label, collection, filter, projection, build) => {
	let ops = [];
	let modified = 0;
	const flush = () => {
		if (ops.length) modified += collection.bulkWrite(ops, { ordered: false }).modifiedCount;
		ops = [];
	};
	collection.find(filter, projection).forEach(doc => {
		const $set = build(doc);
		if ($set && Object.keys($set).length) ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set } } });
		if (ops.length >= BATCH) flush();
	});
	flush();
	print(`${label}: modified ${modified}`);
};

// Fields set only when missing
const missing = (doc, fields) => Object.fromEntries(Object.entries(fields).filter(([key, value]) => doc[key] === undefined && value !== undefined));

// users: _updatedAt, createdAt, roles
migrate('users', db.users, {}, { _updatedAt: 1, createdAt: 1, roles: 1, exUpdatedAt: 1, exCreatedAt: 1 }, u =>
	missing(u, { _updatedAt: u.exUpdatedAt || now, createdAt: u.exCreatedAt || now, roles: ['user'] })
);

// messages: _updatedAt, msg
migrate('messages', db.rocketchat_message, {}, { _updatedAt: 1, msg: 1, editedAt: 1, ts: 1 }, m =>
	missing(m, { _updatedAt: m.editedAt || m.ts, msg: '' })
);

// rooms: lm + lastMessage from the latest visible message (always recomputed)
const lastMessages = {};
db.rocketchat_message
	.find({ _hidden: { $ne: true }, removed: { $ne: true } })
	.sort({ ts: 1 })
	.forEach(m => {
		lastMessages[m.rid] = m;
	});
const LAST_MESSAGE_KEYS = ['t', 'e2e', 'content', 'attachments', 'file', 'files', 'mentions', 'editedAt', 'editedBy'];

// members of each room, from the subscriptions
const members = {};
db.rocketchat_subscription.find({}, { rid: 1, 'u._id': 1 }).forEach(s => {
	(members[s.rid] = members[s.rid] || []).push(s.u._id);
});

migrate('rooms', db.rocketchat_room, {}, {}, r => {
	const set = missing(r, { fname: r.name, usersCount: members[r._id] && new Set(members[r._id]).size });
	const m = lastMessages[r._id];
	if (m) {
		const lastMessage = { _id: m._id, rid: m.rid, msg: m.msg || '', ts: m.ts, u: m.u, _updatedAt: m._updatedAt || m.editedAt || m.ts };
		LAST_MESSAGE_KEYS.forEach(key => {
			if (m[key] !== undefined) lastMessage[key] = m[key];
		});
		set.lastMessage = lastMessage;
		set.lm = m.ts;
	}
	if (r.t === 'd' && !r.uids && members[r._id]) set.uids = [...new Set(members[r._id])].sort();
	if (r._updatedAt === undefined) set._updatedAt = set.lm || r.lm || r.ts;
	return set;
});

// subscriptions: ts from the room, fname (real name of the other user in direct chats), ls, counters, _updatedAt
const roomTs = {};
db.rocketchat_room.find({}, { ts: 1 }).forEach(r => {
	roomTs[r._id] = r.ts;
});
const names = {};
db.users.find({ username: { $exists: true }, name: { $exists: true } }, { username: 1, name: 1 }).forEach(u => {
	names[u.username] = u.name;
});
migrate('subscriptions', db.rocketchat_subscription, {}, {}, s => {
	const ts = s.ts || roomTs[s.rid] || now;
	return missing(s, {
		ts,
		ls: ts,
		fname: s.t === 'd' ? names[s.name] || s.name : s.name,
		_updatedAt: s.exUpdatedAt || now,
		userMentions: 0,
		groupMentions: 0
	});
});
