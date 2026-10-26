/**
 * Makes the attachments of the ROMEO messages copied into `romeo_rc_staging` readable by Rocket.Chat.
 * ROMEO messages carry `file: { _id, name }` and `attachments[]` pointing to `/file-upload/<id>/<name>`, but
 * the staging copy has no `rocketchat_uploads` documents (Rocket.Chat answers 404) and no `files` array on the message.
 * This script: (1) writes one upload document per referenced file, (2) fills `file` and `files` on the messages.
 * Idempotent: existing upload documents are never overwritten, message fields are only set when missing.
 *
 *   ROMEO_SOURCE_DB   optional, e.g. romeo-chat-stage. Upload documents found there are copied (size, type, identify, ...)
 *                     before the ones rebuilt from the messages
 *   UPLOAD_STORE      store name Rocket.Chat expects, default 'FileSystem:Uploads' (use 'GridFS:Uploads' for GridFS)
 *   DRY_RUN=1         only counts, writes nothing
 *
 *   ROMEO_SOURCE_DB=romeo-chat-stage DRY_RUN=1 mongosh mongodb://127.0.0.1:27017/romeo_rc_staging scripts/romeo-staging-attachments.js
 *
 * The file bytes are not in MongoDB: copy them to the folder of `FileUpload_FileSystemPath` (named by upload `_id`),
 * or import them into GridFS, otherwise the document exists but the download is still empty.
 */
const SOURCE_DB = process.env.ROMEO_SOURCE_DB;
const STORE = process.env.UPLOAD_STORE || 'FileSystem:Uploads';
const DRY_RUN = !!process.env.DRY_RUN;
const BATCH = 1000;
const now = new Date();

const MEDIA_PREFIXES = ['image', 'video', 'audio'];
const extensionOf = name => (String(name).includes('.') ? String(name).split('.').pop().toLowerCase() : '');
const typeGroupOf = type => String(type || '').split('/')[0] || undefined;
const urlOf = (id, name) => `/file-upload/${id}/${name}`;
const stripUndefined = obj => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

/** type, size and dimensions of a message's file, read from the first attachment that describes it */
const describe = m => {
	const a = (m.attachments || []).find(att => att.title_link && att.title_link.startsWith('/file-upload/')) || {};
	const mediaKey = MEDIA_PREFIXES.find(prefix => a[`${prefix}_url`]);
	const type = (mediaKey && a[`${mediaKey}_type`]) || a.type || undefined;
	return stripUndefined({
		type,
		size: (mediaKey && a[`${mediaKey}_size`]) || a.size || undefined,
		identify: a.image_dimensions ? { format: extensionOf(m.file.name).toUpperCase(), size: a.image_dimensions } : undefined
	});
};

const withFile = { 'file._id': { $exists: true } };

// 1. upload documents: those of the source database first (they hold the real size/etag/identify), then the ones rebuilt from the messages
const referenced = new Set();
db.rocketchat_message.find(withFile, { 'file._id': 1 }).forEach(m => referenced.add(m.file._id));
const existing = new Set(db.rocketchat_uploads.find({}, { _id: 1 }).toArray().map(u => u._id));
print(`files referenced by messages: ${referenced.size}, already in rocketchat_uploads: ${existing.size}`);

let copied = 0;
if (SOURCE_DB) {
	const sourceUploads = db.getSiblingDB(SOURCE_DB).rocketchat_uploads;
	const wanted = [...referenced].filter(id => !existing.has(id));
	for (let i = 0; i < wanted.length; i += BATCH) {
		const docs = sourceUploads.find({ _id: { $in: wanted.slice(i, i + BATCH) } }).toArray();
		docs.forEach(u => existing.add(u._id));
		copied += docs.length;
		if (!DRY_RUN && docs.length) db.rocketchat_uploads.insertMany(docs, { ordered: false });
	}
	print(`upload documents copied from ${SOURCE_DB}: ${copied}`);
}

let ops = [];
let rebuilt = 0;
const flushUploads = () => {
	if (ops.length && !DRY_RUN) db.rocketchat_uploads.bulkWrite(ops, { ordered: false });
	ops = [];
};
db.rocketchat_message.find(withFile).forEach(m => {
	if (existing.has(m.file._id)) return;
	existing.add(m.file._id);
	const { type, size, identify } = describe(m);
	ops.push({
		updateOne: {
			filter: { _id: m.file._id },
			update: {
				$setOnInsert: stripUndefined({
					name: m.file.name,
					size,
					type,
					typeGroup: typeGroupOf(type),
					extension: extensionOf(m.file.name),
					rid: m.rid,
					userId: m.u && m.u._id,
					complete: true,
					uploading: false,
					progress: 1,
					uploadedAt: m.ts,
					identify,
					_updatedAt: m._updatedAt || m.ts || now
				})
			},
			upsert: true
		}
	});
	rebuilt++;
	if (ops.length >= BATCH) flushUploads();
});
flushUploads();
print(`upload documents rebuilt from messages: ${rebuilt}`);

// every upload document, copied or rebuilt, must point at the store and the route Rocket.Chat serves
let normalized = 0;
if (!DRY_RUN) {
	const referencedIds = [...referenced];
	for (let i = 0; i < referencedIds.length; i += BATCH) {
		const stale = db.rocketchat_uploads.find({ _id: { $in: referencedIds.slice(i, i + BATCH) }, store: { $ne: STORE } }).toArray();
		const writes = stale.map(u => ({
			updateOne: {
				filter: { _id: u._id },
				update: {
					$set: stripUndefined({
						store: STORE,
						complete: true,
						uploading: false,
						progress: 1,
						path: urlOf(u._id, u.name),
						url: urlOf(u._id, u.name),
						extension: u.extension || extensionOf(u.name),
						typeGroup: u.typeGroup || typeGroupOf(u.type),
						etag: u.etag || u._id,
						_updatedAt: u._updatedAt || now
					})
				}
			}
		}));
		if (writes.length) normalized += db.rocketchat_uploads.bulkWrite(writes, { ordered: false }).modifiedCount;
	}
}
print(`upload documents set to store ${STORE}: ${normalized}`);

// 2. messages: file.{type,size,format} and files[] (the shape Rocket.Chat 6+ clients read)
const uploads = {};
const uploadsOf = ids => db.rocketchat_uploads.find({ _id: { $in: ids } }, { name: 1, type: 1, size: 1, extension: 1 }).forEach(u => (uploads[u._id] = u));
let messageOps = [];
let messagesFixed = 0;
const flushMessages = () => {
	if (messageOps.length && !DRY_RUN) messagesFixed += db.rocketchat_message.bulkWrite(messageOps, { ordered: false }).modifiedCount;
	else messagesFixed += messageOps.length;
	messageOps = [];
};
let batch = [];
const processBatch = () => {
	uploadsOf(batch.map(m => m.file._id));
	batch.forEach(m => {
		const u = uploads[m.file._id] || {};
		const info = describe(m);
		const type = u.type || info.type;
		const size = u.size || info.size;
		const file = stripUndefined({ ...m.file, type, size, format: u.extension || extensionOf(m.file.name) });
		const $set = {};
		if (m.file.type === undefined && type) $set.file = file;
		if (m.files === undefined) $set.files = [file];
		if (Object.keys($set).length) messageOps.push({ updateOne: { filter: { _id: m._id }, update: { $set } } });
		if (messageOps.length >= BATCH) flushMessages();
	});
	batch = [];
};
db.rocketchat_message.find(withFile, { file: 1, files: 1, attachments: 1 }).forEach(m => {
	batch.push(m);
	if (batch.length >= BATCH) processBatch();
});
processBatch();
flushMessages();
print(`messages with file/files completed${DRY_RUN ? ' (dry run, would be)' : ''}: ${messagesFixed}`);

// attachments that point at a path of the sender's phone (file:///..., /data/user/...) cannot be recovered: only reported
const deviceLinks = db.rocketchat_message.countDocuments({ 'attachments.title_link': { $regex: '^(file:|/data/user/)' } });
print(`attachments pointing at a device path, not recoverable: ${deviceLinks}`);
