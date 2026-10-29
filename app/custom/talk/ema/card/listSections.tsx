import { useState } from 'react';
import { Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

import I18n from '~/i18n';
import { CustomIcon } from '~/containers/CustomIcon';
import { useActionSheet } from '~/containers/ActionSheet';
import { sortBetween, attachmentUrl, type EventFields } from '../emaActions';
import { type EmaAttachment, type EmaCard, type EmaEvent, type EmaLabel, type EmaListWithItems } from '../types';
import { formatCardDate } from './headerSections';
import {
	CardBlock,
	colorOfLabel,
	COLORS,
	LABEL_COLORS,
	PlusButton,
	Sheet,
	TextSheet,
	WideButton,
	cardText,
	inputStyle,
	ConfirmSheet
} from './ui';

const styles = StyleSheet.create({
	list: { backgroundColor: COLORS.white, borderRadius: 6, padding: 10, marginTop: 8 },
	listHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
	done: { textDecorationLine: 'line-through', color: COLORS.textLight },
	addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
	labelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
	event: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
	attachment: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
	thumb: { width: 44, height: 44, borderRadius: 4, backgroundColor: COLORS.grey },
	swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
	swatch: { width: 36, height: 36, borderRadius: 18 }
});

const isClosed = (task: EmaCard, listId: string) => !!task.parents?.some(parent => parent.listId === listId && parent.closed);

type TTasksProps = {
	lists: EmaListWithItems[];
	itemsCount: number;
	completedCount: number;
	approval?: boolean;
	canEdit: boolean;
	onAddTask: (listId: string, title: string) => void;
	onToggleTask: (task: EmaCard, completed: boolean) => void;
	onAddList: (title: string) => void;
	onRenameList: (listId: string, title: string) => void;
	onArchiveList: (listId: string) => void;
	onSetListKind: (listId: string, kind: 'default' | 'done', on: boolean) => void;
	onCopyTaskLink: (task: EmaCard) => void;
	onRenameTask: (task: EmaCard, title: string) => void;
	onArchiveTask: (task: EmaCard) => void;
	onMoveTask: (task: EmaCard, fromListId: string, toListId: string, sort: number) => void;
};

type TDialog =
	| { kind: 'renameList' | 'newList'; list?: EmaListWithItems }
	| { kind: 'renameTask' | 'archiveTask'; task: EmaCard };

/** Tasks (or approvals): lists with their tasks, open ones first, plus every action the ROMEO menus offer. */
export const CardTasks = (props: TTasksProps) => {
	const { lists, itemsCount, completedCount, approval, canEdit } = props;
	const { showActionSheet } = useActionSheet();
	const [dialog, setDialog] = useState<TDialog>();
	const [drafts, setDrafts] = useState<Record<string, string>>({});

	const taskMenu = (task: EmaCard, list: EmaListWithItems) => {
		const open = list.items.filter(item => !isClosed(item, list._id));
		const index = open.findIndex(item => item._id === task._id);
		const moveTo = (toList: EmaListWithItems) => {
			const first = toList.items.filter(item => !isClosed(item, toList._id))[0];
			props.onMoveTask(task, list._id, toList._id, sortBetween(undefined, first, toList._id));
		};
		showActionSheet({
			options: [
				{ title: I18n.t('Exentriq_Card_Copy_link'), icon: 'link', onPress: () => props.onCopyTaskLink(task) },
				...(canEdit
					? [
							{
								title: I18n.t('Exentriq_Card_Edit_details'),
								icon: 'edit' as const,
								onPress: () => setDialog({ kind: 'renameTask', task })
							},
							...(index > 0
								? [
										{
											title: I18n.t('Exentriq_Card_Move_up'),
											icon: 'chevron-up' as const,
											onPress: () =>
												props.onMoveTask(task, list._id, list._id, sortBetween(open[index - 2], open[index - 1], list._id))
										}
									]
								: []),
							...(index !== -1 && index < open.length - 1
								? [
										{
											title: I18n.t('Exentriq_Card_Move_down'),
											icon: 'chevron-down' as const,
											onPress: () =>
												props.onMoveTask(task, list._id, list._id, sortBetween(open[index + 1], open[index + 2], list._id))
										}
									]
								: []),
							...lists
								.filter(other => other._id !== list._id)
								.map(other => ({
									title: I18n.t('Exentriq_Card_Move_to', { list: other.title }),
									icon: 'arrow-right' as const,
									onPress: () => moveTo(other)
								})),
							{
								title: I18n.t('Exentriq_Card_Archive'),
								icon: 'delete' as const,
								danger: true,
								onPress: () => setDialog({ kind: 'archiveTask', task })
							}
						]
					: [])
			]
		});
	};

	const listMenu = (list: EmaListWithItems) =>
		showActionSheet({
			options: [
				{ title: I18n.t('Exentriq_Card_Rename'), icon: 'edit', onPress: () => setDialog({ kind: 'renameList', list }) },
				...(!approval
					? [
							{
								title: `${list.meta?.isBacklog ? '✓ ' : ''}${I18n.t('Exentriq_Card_List_default')}`,
								icon: 'check' as const,
								onPress: () => props.onSetListKind(list._id, 'default', true)
							},
							...(!list.meta?.isBacklog
								? [
										{
											title: `${list.meta?.isDone ? '✓ ' : ''}${I18n.t('Exentriq_Card_List_done')}`,
											icon: 'check' as const,
											onPress: () => props.onSetListKind(list._id, 'done', !list.meta?.isDone)
										}
									]
								: [])
						]
					: []),
				...(approval || (!list.meta?.isBacklog && !list.meta?.isDone) || list.items.length === 0
					? [
							{
								title: I18n.t('Exentriq_Card_Archive'),
								icon: 'delete' as const,
								danger: true,
								onPress: () => props.onArchiveList(list._id)
							}
						]
					: [])
			]
		});

	const submit = (list: EmaListWithItems) => {
		const title = (drafts[list._id] ?? '').trim();
		if (!title) {
			return;
		}
		setDrafts(current => ({ ...current, [list._id]: '' }));
		props.onAddTask(list._id, title);
	};

	const renderTask = (task: EmaCard, list: EmaListWithItems) => {
		const closed = isClosed(task, list._id);
		return (
			<View key={task._id} style={styles.task}>
				<TouchableOpacity
					disabled={!canEdit}
					onPress={() => props.onToggleTask(task, !closed)}
					accessibilityRole='checkbox'
					accessibilityState={{ checked: closed, disabled: !canEdit }}
					accessibilityLabel={task.title}>
					<CustomIcon
						name={closed ? 'checkbox-checked' : 'checkbox-unchecked'}
						size={22}
						color={closed ? COLORS.primary : COLORS.textLight}
					/>
				</TouchableOpacity>
				<Text style={[cardText.normal, { flex: 1 }, closed && styles.done]}>{task.title}</Text>
				<TouchableOpacity onPress={() => taskMenu(task, list)} accessibilityLabel={task.title} hitSlop={8}>
					<CustomIcon name='kebab' size={20} color={COLORS.textLight} />
				</TouchableOpacity>
			</View>
		);
	};

	const label = approval
		? I18n.t('Exentriq_Card_Approvals')
		: `${I18n.t('Exentriq_Card_Tasks')} (${itemsCount}/${completedCount})`;
	const addLabel = approval ? I18n.t('Exentriq_Card_Add_group') : I18n.t('Exentriq_Card_Add_tasklist');

	return (
		<CardBlock label={label}>
			{!lists.length ? <Text style={cardText.light}>{I18n.t('Exentriq_Card_No_tasks_yet')}</Text> : null}
			{lists.map(list => {
				const open = list.items.filter(task => !isClosed(task, list._id));
				const closed = list.items.filter(task => isClosed(task, list._id));
				return (
					<View key={list._id} style={styles.list}>
						<View style={styles.listHead}>
							<Text style={[cardText.label, { flex: 1 }]}>
								{list.title}{' '}
								<Text style={cardText.light}>
									({list.meta?.completedItemsCount ?? closed.length}/{list.meta?.itemsCount ?? list.items.length})
								</Text>
							</Text>
							{canEdit ? (
								<TouchableOpacity onPress={() => listMenu(list)} accessibilityLabel={list.title} hitSlop={8}>
									<CustomIcon name='kebab' size={20} color={COLORS.textLight} />
								</TouchableOpacity>
							) : null}
						</View>
						{open.map(task => renderTask(task, list))}
						{closed.map(task => renderTask(task, list))}
						{canEdit ? (
							<View style={styles.addRow}>
								<TextInput
									value={drafts[list._id] ?? ''}
									onChangeText={value => setDrafts(current => ({ ...current, [list._id]: value }))}
									onSubmitEditing={() => submit(list)}
									placeholder={I18n.t('Exentriq_Card_Add_item')}
									placeholderTextColor={COLORS.textLight}
									returnKeyType='done'
									style={[inputStyle, { flex: 1 }]}
								/>
								<PlusButton label={I18n.t('Exentriq_Card_Add_item')} onPress={() => submit(list)} />
							</View>
						) : null}
					</View>
				);
			})}
			{canEdit ? <WideButton label={addLabel} onPress={() => setDialog({ kind: 'newList' })} /> : null}
			{dialog?.kind === 'newList' ? (
				<TextSheet
					title={addLabel}
					value=''
					onSave={text => text.trim() && props.onAddList(text.trim())}
					onClose={() => setDialog(undefined)}
				/>
			) : null}
			{dialog?.kind === 'renameList' && dialog.list ? (
				<TextSheet
					title={I18n.t('Exentriq_Card_Rename')}
					value={dialog.list.title}
					onSave={text => text.trim() && props.onRenameList((dialog.list as EmaListWithItems)._id, text.trim())}
					onClose={() => setDialog(undefined)}
				/>
			) : null}
			{dialog?.kind === 'renameTask' ? (
				<TextSheet
					title={I18n.t('Exentriq_Card_Edit_details')}
					value={dialog.task.title}
					multiline
					onSave={text => text.trim() && props.onRenameTask(dialog.task, text.trim())}
					onClose={() => setDialog(undefined)}
				/>
			) : null}
			{dialog?.kind === 'archiveTask' ? (
				<ConfirmSheet
					title={I18n.t('Exentriq_Card_Archive')}
					message={I18n.t('Exentriq_Card_Archive_activity_confirm', { name: dialog.task.title })}
					confirmLabel={I18n.t('Exentriq_Card_Archive')}
					onConfirm={() => {
						props.onArchiveTask(dialog.task);
						setDialog(undefined);
					}}
					onClose={() => setDialog(undefined)}
				/>
			) : null}
		</CardBlock>
	);
};

/** The card's labels as coloured chips, with the board's labels to pick from and, for who may, to create and change. */
export const CardLabels = ({
	labels,
	boardLabels,
	canEdit,
	canManage,
	onToggle,
	onCreate,
	onUpdate
}: {
	labels: EmaLabel[];
	boardLabels: EmaLabel[];
	canEdit: boolean;
	canManage: boolean;
	onToggle: (labelId: string) => void;
	onCreate: (title: string, color: string) => void;
	onUpdate: (labelId: string, title: string, color: string) => void;
}) => {
	const [managing, setManaging] = useState(false);
	const [editing, setEditing] = useState<EmaLabel | 'new'>();
	const [title, setTitle] = useState('');
	const [color, setColor] = useState('green');

	const startEdit = (label: EmaLabel | 'new') => {
		setEditing(label);
		setTitle(label === 'new' ? '' : (label.title ?? ''));
		setColor(label === 'new' ? 'green' : (label.color ?? 'green'));
	};
	const selected = labels.map(label => label._id);

	return (
		<CardBlock label={I18n.t('Exentriq_Card_Labels')}>
			<View style={styles.chips}>
				{labels.map(label => (
					<TouchableOpacity
						key={label._id}
						disabled={!canEdit}
						onPress={() => onToggle(label._id)}
						style={[styles.labelChip, { backgroundColor: colorOfLabel(label.color) }]}
						accessibilityLabel={`${I18n.t('Exentriq_Card_Remove_label')} ${label.title ?? ''}`}>
						<Text style={{ color: COLORS.white, fontSize: 14 }}>{label.title || label.color}</Text>
						{canEdit ? <CustomIcon name='close' size={14} color={COLORS.white} /> : null}
					</TouchableOpacity>
				))}
				{canEdit ? <PlusButton label={I18n.t('Exentriq_Card_Add_label')} onPress={() => setManaging(true)} /> : null}
			</View>
			{managing && !editing ? (
				<Sheet title={I18n.t('Exentriq_Card_Labels')} onClose={() => setManaging(false)}>
					{!canManage ? (
						<Text style={[cardText.light, { marginBottom: 8 }]}>{I18n.t('Exentriq_Card_Labels_need_board_role')}</Text>
					) : null}
					{boardLabels.map(label => (
						<View key={label._id} style={styles.event}>
							<TouchableOpacity
								onPress={() => onToggle(label._id)}
								style={[styles.labelChip, { backgroundColor: colorOfLabel(label.color), flex: 1 }]}>
								<Text style={{ color: COLORS.white, fontSize: 14, flex: 1 }}>{label.title || label.color}</Text>
								{selected.includes(label._id) ? <CustomIcon name='check' size={16} color={COLORS.white} /> : null}
							</TouchableOpacity>
							{canManage ? (
								<TouchableOpacity onPress={() => startEdit(label)} accessibilityLabel={I18n.t('Edit')}>
									<CustomIcon name='edit' size={20} color={COLORS.text} />
								</TouchableOpacity>
							) : null}
						</View>
					))}
					{canManage ? <WideButton label={I18n.t('Exentriq_Card_Create_label')} onPress={() => startEdit('new')} /> : null}
				</Sheet>
			) : null}
			{editing ? (
				<Sheet
					title={editing === 'new' ? I18n.t('Exentriq_Card_Create_label') : I18n.t('Exentriq_Card_Label')}
					onClose={() => setEditing(undefined)}>
					<TextInput
						value={title}
						onChangeText={setTitle}
						placeholder={I18n.t('Exentriq_Card_Label_name')}
						style={inputStyle}
						autoFocus
					/>
					<View style={styles.swatches}>
						{Object.entries(LABEL_COLORS).map(([name, hex]) => (
							<TouchableOpacity
								key={name}
								onPress={() => setColor(name)}
								accessibilityLabel={name}
								style={[styles.swatch, { backgroundColor: hex, borderWidth: color === name ? 3 : 0, borderColor: COLORS.text }]}
							/>
						))}
					</View>
					<WideButton
						label={I18n.t('Save')}
						onPress={() => {
							if (editing === 'new') {
								onCreate(title.trim(), color);
							} else {
								onUpdate(editing._id, title.trim(), color);
							}
							setEditing(undefined);
						}}
					/>
				</Sheet>
			) : null}
		</CardBlock>
	);
};

const formatEventDate = (date?: Date | string) => (date ? formatCardDate(date) : '');

/** The card's calendar: events with a title and optional start and end. */
export const CardCalendar = ({
	events,
	canEdit,
	onAdd,
	onUpdate,
	onRemove
}: {
	events: EmaEvent[];
	canEdit: boolean;
	onAdd: (fields: EventFields) => void;
	onUpdate: (eventId: string, fields: EventFields) => void;
	onRemove: (eventId: string) => void;
}) => {
	const { showActionSheet } = useActionSheet();
	const [editing, setEditing] = useState<EmaEvent | 'new'>();
	const [title, setTitle] = useState('');
	const [start, setStart] = useState<Date | null>(null);
	const [end, setEnd] = useState<Date | null>(null);
	const [picking, setPicking] = useState<'start' | 'end'>();
	const [error, setError] = useState<string>();

	const open = (event: EmaEvent | 'new') => {
		setEditing(event);
		setTitle(event === 'new' ? '' : (event.title ?? ''));
		setStart(event === 'new' || !event.startDate ? null : new Date(event.startDate));
		setEnd(event === 'new' || !event.dueDate ? null : new Date(event.dueDate));
		setError(undefined);
	};

	const save = () => {
		if (start && end && end < start) {
			setError(I18n.t('Exentriq_Card_Event_end_before_start'));
			return;
		}
		const fields = { title: title.trim(), startDate: start, dueDate: end };
		if (editing === 'new') {
			onAdd(fields);
		} else if (editing) {
			onUpdate(editing._id, fields);
		}
		setEditing(undefined);
	};

	const menu = (event: EmaEvent) =>
		showActionSheet({
			options: [
				{ title: I18n.t('Exentriq_Card_Edit_event'), icon: 'edit', onPress: () => open(event) },
				{ title: I18n.t('Exentriq_Card_Remove'), icon: 'delete', danger: true, onPress: () => onRemove(event._id) }
			]
		});

	const dateButton = (which: 'start' | 'end', value: Date | null) => (
		<TouchableOpacity onPress={() => setPicking(which)} style={[inputStyle, { flex: 1 }]}>
			<Text style={value ? cardText.normal : cardText.light}>
				{which === 'start' ? I18n.t('Exentriq_Card_Start') : I18n.t('Exentriq_Card_End')}: {value ? formatCardDate(value) : '—'}
			</Text>
		</TouchableOpacity>
	);

	return (
		<CardBlock label={I18n.t('Exentriq_Card_Calendar')}>
			{events.map(event => (
				<View key={event._id} style={styles.event}>
					<CustomIcon name='calendar' size={20} color={COLORS.text} />
					<View style={{ flex: 1 }}>
						<Text style={cardText.normal}>{event.title}</Text>
						<Text style={cardText.light}>
							{[formatEventDate(event.startDate), formatEventDate(event.dueDate)].filter(Boolean).join(' → ')}
						</Text>
					</View>
					{canEdit ? (
						<TouchableOpacity onPress={() => menu(event)} accessibilityLabel={I18n.t('Exentriq_Card_Event_actions')} hitSlop={8}>
							<CustomIcon name='kebab' size={20} color={COLORS.textLight} />
						</TouchableOpacity>
					) : null}
				</View>
			))}
			{canEdit ? <WideButton label={I18n.t('Exentriq_Card_Add_event')} onPress={() => open('new')} /> : null}
			{editing ? (
				<Sheet
					title={editing === 'new' ? I18n.t('Exentriq_Card_Add_event') : I18n.t('Exentriq_Card_Edit_event')}
					onClose={() => setEditing(undefined)}>
					<TextInput
						value={title}
						onChangeText={setTitle}
						placeholder={I18n.t('Exentriq_Card_Name')}
						style={inputStyle}
						autoFocus
					/>
					<View style={[styles.addRow, { marginTop: 12 }]}>
						{dateButton('start', start)}
						{dateButton('end', end)}
					</View>
					{picking ? (
						<DateTimePicker
							value={(picking === 'start' ? start : end) ?? new Date()}
							mode='date'
							display='inline'
							onChange={(_, date) => {
								if (date) {
									(picking === 'start' ? setStart : setEnd)(date);
								}
								setPicking(undefined);
							}}
						/>
					) : null}
					{error ? <Text style={{ color: COLORS.red, marginTop: 8 }}>{error}</Text> : null}
					<WideButton label={I18n.t('Save')} onPress={save} />
				</Sheet>
			) : null}
		</CardBlock>
	);
};

/** "Attachments (n)": the files of the card, each opened in the browser, with cover and delete for editors, and upload. */
export const CardAttachments = ({
	attachments,
	canEdit,
	coverId,
	urlOf,
	onUpload,
	onRemove,
	onCover
}: {
	attachments: EmaAttachment[];
	canEdit: boolean;
	coverId?: string;
	urlOf: (attachment: EmaAttachment) => string | undefined;
	onUpload: (file: { uri: string; name: string; type: string; size: number }) => Promise<void>;
	onRemove: (attachment: EmaAttachment) => void;
	onCover: (attachmentId: string | undefined) => void;
}) => {
	const { showActionSheet } = useActionSheet();
	const [uploading, setUploading] = useState(0);
	const [removing, setRemoving] = useState<EmaAttachment>();

	const pick = async () => {
		const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
		if (result.canceled) {
			return;
		}
		setUploading(count => count + result.assets.length);
		await Promise.all(
			result.assets.map(asset =>
				onUpload({
					uri: asset.uri,
					name: asset.name,
					type: asset.mimeType ?? 'application/octet-stream',
					size: asset.size ?? 0
				}).finally(() => setUploading(count => count - 1))
			)
		);
	};

	const menu = (attachment: EmaAttachment) =>
		showActionSheet({
			options: [
				{ title: I18n.t('Open'), icon: 'link', onPress: () => Linking.openURL(urlOf(attachment) ?? '') },
				...(canEdit
					? [
							...(attachment.isImage
								? [
										{
											title: attachment._id === coverId ? I18n.t('Exentriq_Card_Remove_cover') : I18n.t('Exentriq_Card_Cover'),
											icon: 'image' as const,
											onPress: () => onCover(attachment._id === coverId ? undefined : attachment._id)
										}
									]
								: []),
							{
								title: I18n.t('Exentriq_Card_Remove'),
								icon: 'delete' as const,
								danger: true,
								onPress: () => setRemoving(attachment)
							}
						]
					: [])
			]
		});

	return (
		<CardBlock label={`${I18n.t('Exentriq_Card_Attachments')} (${attachments.length})`}>
			{canEdit ? (
				<WideButton label={uploading ? I18n.t('Exentriq_Card_Uploading') : I18n.t('Exentriq_Card_Drop_a_file')} onPress={pick} />
			) : null}
			{attachments.map(attachment => (
				<TouchableOpacity key={attachment._id} onPress={() => menu(attachment)} style={styles.attachment}>
					{attachment.isImage ? (
						<Image source={{ uri: urlOf(attachment) }} style={styles.thumb} />
					) : (
						<View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
							<CustomIcon name='attach' size={20} color={COLORS.text} />
						</View>
					)}
					<Text style={[cardText.normal, { flex: 1 }]} numberOfLines={1}>
						{attachment.name}
					</Text>
					{attachment._id === coverId ? <CustomIcon name='star' size={16} color={COLORS.primary} /> : null}
				</TouchableOpacity>
			))}
			{removing ? (
				<ConfirmSheet
					title={I18n.t('Exentriq_Card_Remove')}
					message={I18n.t('Exentriq_Card_Delete_attachment_confirm', { name: removing.name })}
					confirmLabel={I18n.t('Exentriq_Card_Remove')}
					onConfirm={() => {
						onRemove(removing);
						setRemoving(undefined);
					}}
					onClose={() => setRemoving(undefined)}
				/>
			) : null}
		</CardBlock>
	);
};

export { attachmentUrl };
