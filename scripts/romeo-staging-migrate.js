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

// End-to-end ciphertext cannot be read without the owners' keys, so it is dropped before the rooms' last messages are recomputed
print(`e2e messages deleted: ${db.rocketchat_message.deleteMany({ t: 'e2e' }).deletedCount}`);

// real name of each user by username: the message bubbles show it, never the username
const names = {};
db.users.find({ username: { $exists: true }, name: { $exists: true } }, { username: 1, name: 1 }).forEach(u => {
	names[u.username] = u.name;
});

// messages: _updatedAt, msg, u.name
migrate('messages', db.rocketchat_message, {}, { _updatedAt: 1, msg: 1, editedAt: 1, ts: 1, u: 1 }, m => {
	const set = missing(m, { _updatedAt: m.editedAt || m.ts, msg: '' });
	if (m.u && m.u.username && !m.u.name && names[m.u.username]) set['u.name'] = names[m.u.username];
	return set;
});

// rooms: lm + lastMessage from the latest visible message (always recomputed)
const lastMessages = {};
db.rocketchat_message
	.find({ _hidden: { $ne: true }, removed: { $ne: true } })
	.sort({ ts: 1 })
	.forEach(m => {
		lastMessages[m.rid] = m;
	});
const LAST_MESSAGE_KEYS = ['t', 'e2e', 'content', 'attachments', 'file', 'files', 'mentions', 'editedAt', 'editedBy'];

// ROMEO keeps a preview on each subscription even when the message itself is not in the collection: the newest one stands in for the room
const previews = {};
db.rocketchat_subscription.find({ lastMessage: { $exists: true } }, { rid: 1, lastMessage: 1, lm: 1 }).forEach(s => {
	const ts = new Date(s.lastMessage.ts || s.lm || 0);
	const encrypted = s.lastMessage.t === 'e2e' || s.lastMessage.e2e !== undefined || s.lastMessage.content !== undefined;
	if (!ts.getTime() || encrypted) return;
	if (!previews[s.rid] || previews[s.rid].ts < ts) previews[s.rid] = { ...s.lastMessage, rid: s.rid, ts };
});

// members of each room, from the subscriptions
const members = {};
db.rocketchat_subscription.find({}, { rid: 1, 'u._id': 1 }).forEach(s => {
	(members[s.rid] = members[s.rid] || []).push(s.u._id);
});

migrate('rooms', db.rocketchat_room, {}, {}, r => {
	const set = missing(r, { fname: r.name, usersCount: members[r._id] && new Set(members[r._id]).size });
	const preview = previews[r._id];
	const latest = lastMessages[r._id];
	const m = preview && (!latest || preview.ts > latest.ts) ? preview : latest;
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
migrate('subscriptions', db.rocketchat_subscription, {}, {}, s => {
	const ts = s.ts || roomTs[s.rid] || now;
	const set = missing(s, {
		ts,
		ls: ts,
		fname: s.t === 'd' ? names[s.name] || s.name : s.name,
		_updatedAt: s.exUpdatedAt || now,
		userMentions: 0,
		groupMentions: 0
	});
	// ROMEO's subName is the display name the user sees, so it wins over any derived fname
	if (s.subName && s.fname !== s.subName) set.fname = s.subName;
	return set;
});

// ROMEO groups without a title: Rocket.Chat needs a unique `name` for the route and a readable `fname` for the sidebar
let untitledRooms = 0;
let untitledSubscriptions = 0;
db.rocketchat_room.find({ t: { $ne: 'd' }, $or: [{ name: '' }, { name: null }, { name: { $exists: false } }] }, { usernames: 1 }).forEach(r => {
	const fname = (r.usernames || []).join(', ') || r._id;
	untitledRooms += db.rocketchat_room.updateOne({ _id: r._id }, { $set: { name: r._id, fname } }).modifiedCount;
	untitledSubscriptions += db.rocketchat_subscription.updateMany({ rid: r._id }, { $set: { name: r._id, fname } }).modifiedCount;
});
print(`untitled groups named: rooms ${untitledRooms}, subscriptions ${untitledSubscriptions}`);

// ROMEO stores the presence in the subscription's `status`, which Rocket.Chat reads as a pending invitation and denies room access
const renamedStatus = db.rocketchat_subscription.updateMany({ status: { $exists: true, $ne: 'INVITED' } }, { $rename: { status: 'exStatus' } }).modifiedCount;
print(`subscription status renamed to exStatus: ${renamedStatus}`);

// ROMEO subscriptions carry their own copy of the last message; keep it identical to the room's so every client shows the same preview
let alignedPreviews = 0;
let clearedPreviews = 0;
db.rocketchat_room.find({}, { lastMessage: 1, lm: 1 }).forEach(r => {
	const stale = { rid: r._id, $or: [{ lastMessage: { $exists: true } }, { lm: { $exists: true } }] };
	if (r.lastMessage) {
		alignedPreviews += db.rocketchat_subscription.updateMany(stale, { $set: { lastMessage: r.lastMessage, lm: r.lm } }).modifiedCount;
	} else {
		clearedPreviews += db.rocketchat_subscription.updateMany(stale, { $unset: { lastMessage: '', lm: '' } }).modifiedCount;
	}
});
print(`subscription last messages aligned: ${alignedPreviews}, cleared: ${clearedPreviews}`);

// The sidebar only shows each room's last message in the extended view, so users without a preference of their own get it by default
db.rocketchat_settings.updateOne(
	{ _id: 'Accounts_Default_User_Preferences_sidebarViewMode' },
	{ $set: { value: 'extended', _updatedAt: new Date() } }
);
print('sidebar default view: extended');

// Meet calls and untitled groups have an id as `name`; with this flag every client shows the readable `fname` instead
db.rocketchat_settings.updateOne(
	{ _id: 'UI_Allow_room_names_with_special_chars' },
	{ $set: { value: true, _updatedAt: new Date() } }
);
print('room titles: fname');

// ROMEO meet calls become ended Rocket.Chat video conferences, so each call is a record tied to its room and to the invite message
const firstInvite = {};
db.rocketchat_message
	.find({ t: 'meet', meetRoomId: { $exists: true } }, { meetRoomId: 1, ts: 1, u: 1 })
	.sort({ ts: 1 })
	.forEach(m => {
		if (!firstInvite[m.meetRoomId]) firstInvite[m.meetRoomId] = m;
	});
const rooms = {};
db.rocketchat_room.find({}, { t: 1, fname: 1, name: 1, u: 1 }).forEach(r => {
	rooms[r._id] = r;
});
const userOf = ({ id, _id, username, name }) => ({ _id: id || _id, username, name: name || username });

let videoConferences = [];
db.exentriq_meet_calls.find({}).forEach(call => {
	const room = rooms[call.rid];
	if (!room || !(call.users || []).length) return;
	const createdAt = call.startedAt || call.started || now;
	const invite = firstInvite[call._id];
	const members = call.users.filter(u => u.username).map(userOf);
	const createdBy = (invite && invite.u && userOf(invite.u)) || (room.u && members.find(u => u._id === room.u._id)) || members[0];
	if (!createdBy) return;
	const video = {
		type: room.t === 'd' ? 'direct' : 'videoconference',
		rid: call.rid,
		users: members.map(u => ({ ...u, avatarETag: null, ts: createdAt, joined: true, joinedAt: createdAt })),
		status: 3,
		messages: invite ? { started: invite._id } : {},
		createdBy,
		createdAt,
		endedAt: call.lastActive || createdAt,
		providerName: 'romeo',
		providerData: { uuid: call.uuid },
		_updatedAt: call.exUpdatedAt || call.lastActive || createdAt
	};
	if (video.type === 'videoconference') {
		video.anonymousUsers = 0;
		video.title = call.name || room.fname || room.name || '';
	}
	// Only inserted: a record that already exists keeps the link to the message romeo-staging-messages.js converted
	videoConferences.push({ updateOne: { filter: { _id: call._id }, update: { $setOnInsert: video }, upsert: true } });
});
const written = videoConferences.length ? db.rocketchat_video_conference.bulkWrite(videoConferences, { ordered: false }) : null;
print(`video conferences: upserted ${written ? written.upsertedCount : 0}, modified ${written ? written.modifiedCount : 0} of ${db.exentriq_meet_calls.countDocuments({})} calls`);

// The copied settings still name the ROMEO workspace and its port
['Site_Name', 'Site_Url'].forEach(_id => {
	const value = _id === 'Site_Name' ? 'Pulsy.Q' : 'http://localhost:3100';
	db.rocketchat_settings.updateOne({ _id }, { $set: { value, _updatedAt: new Date() } });
});
print('workspace: Pulsy.Q on http://localhost:3100');
