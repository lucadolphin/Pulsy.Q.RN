import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Clipboard from '@react-native-clipboard/clipboard';

import I18n from '~/i18n';
import SafeAreaView from '~/containers/SafeAreaView';
import log from '~/lib/methods/helpers/log';
import * as ema from './emaActions';
import { type EmaCard } from './types';
import { useEmaCard } from './useEmaCard';
import { ActivitySheet, CardHeaderBar, CardMeta, CardTop, ColorSheet, formatCardDateTime } from './card/headerSections';
import { CardDescription, CardLinks, CardPeople, type Person } from './card/peopleSections';
import { CardAttachments, CardCalendar, CardLabels, CardTasks } from './card/listSections';
import { COLORS, ConfirmSheet, Editable, Sheet, WideButton, cardText } from './card/ui';

type TRoute = RouteProp<{ CardDetailsView: { rid: string; cardId: string } }, 'CardDetailsView'>;

const styles = StyleSheet.create({
	content: { padding: 16, paddingBottom: 64 },
	title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 14 },
	created: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
	error: { backgroundColor: '#fdecec', borderRadius: 6, padding: 10, marginTop: 12 },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }
});

type TChoice = {
	entityId: string;
	parentId: string;
	done: boolean;
	prefer: Record<string, string>;
	lists: ema.ListChoice;
};

/** The EMA card a room belongs to, laid out like ROMEO's "Open Task" panel, editable by people with write access in EMA. */
const CardDetailsView = () => {
	const { params } = useRoute<TRoute>();
	const navigation = useNavigation();
	const state = useEmaCard(params.cardId);
	const [error, setError] = useState<string>();
	const [dialog, setDialog] = useState<'color' | 'activity' | 'archive' | 'eta'>();
	const [choice, setChoice] = useState<TChoice>();
	const [customerName, setCustomerName] = useState<string>();

	const customerId = state.status === 'ready' ? state.card.meta?.customerId : undefined;
	useEffect(() => {
		setCustomerName(undefined);
		if (customerId) {
			ema.getCustomerName(customerId).then(setCustomerName, () => undefined);
		}
	}, [customerId]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: I18n.t('Exentriq_Card_Open_Task'),
			headerStyle: { backgroundColor: COLORS.headerTeal },
			headerTintColor: COLORS.white
		});
	}, [navigation]);

	if (state.status !== 'ready') {
		return (
			<SafeAreaView>
				<View style={styles.center}>
					{state.status === 'error' ? (
						<Text style={cardText.normal}>
							{state.reason === 'not-found'
								? I18n.t('Exentriq_Card_Not_found')
								: state.reason === 'error-ema-not-configured'
									? I18n.t('Exentriq_Card_EMA_not_configured')
									: state.reason}
						</Text>
					) : (
						<ActivityIndicator color={COLORS.textLight} />
					)}
				</View>
			</SafeAreaView>
		);
	}

	const { card, canEdit, users, taskLists, approvalLists, events, labels, boardLabels, boardId, canManageLabels, attachments } =
		state;
	const { meta = {}, parents = [] } = card;
	const main = parents.find(parent => parent.isMain);
	const completed = parents.some(parent => parent.id === main?.id && parent.closed && !parent.archived);

	const person = (id: string): Person => ({
		id,
		username: users[id]?.username ?? card.members?.find(member => member.id === id)?.username,
		name: users[id]?.name,
		email: users[id]?.email ?? users[id]?.emails?.[0]?.address
	});
	const members = (card.members ?? []).map(member => person(member.id));
	const responsible = (meta.RESPONSIBLE ?? []).map(person);
	const creator = card.userId ? users[card.userId] : undefined;
	const allLists = [...taskLists, ...approvalLists];
	const itemsCount = meta.itemsCount ?? allLists.reduce((sum, list) => sum + list.items.length, 0);

	const run = async (write: () => Promise<unknown>) => {
		setError(undefined);
		try {
			await write();
		} catch (e) {
			log(e);
			setError((e as { reason?: string }).reason ?? (e as Error).message);
		}
	};
	const save = (path: string, value: unknown) => run(() => ema.setField(card._id, path, value));

	// When the board has several lists to complete or reopen into, EMA asks which one: the choice is shown until a list is picked.
	const complete = (entityId: string, parentId: string, done: boolean, prefer: Record<string, string> = {}) =>
		run(async () => {
			const lists = await ema.setCompleted(entityId, parentId, done, prefer);
			setChoice(lists && { entityId, parentId, done, prefer, lists });
		});

	const copyLink = async (entityId: string) => {
		const link = await ema.getLink(entityId).catch(() => undefined);
		if (link) {
			Clipboard.setString(link);
		}
	};

	const taskActions = {
		onToggleTask: (task: EmaCard, done: boolean) => complete(task._id, card._id, done),
		onRenameList: (listId: string, title: string) => run(() => ema.renameList(listId, title)),
		onArchiveList: (listId: string) => run(() => ema.archiveList(listId, main?.id ?? card._id)),
		onSetListKind: (listId: string, kind: 'default' | 'done', on: boolean) => run(() => ema.setListKind(listId, kind, on)),
		onCopyTaskLink: (task: EmaCard) => copyLink(task._id),
		onRenameTask: (task: EmaCard, title: string) => run(() => ema.renameEntity(task._id, title)),
		onArchiveTask: (task: EmaCard) => run(() => ema.archiveEntity(task._id, card._id)),
		onMoveTask: (task: EmaCard, from: string, to: string, sort: number) => run(() => ema.moveTask(task, from, to, sort))
	};

	return (
		<SafeAreaView>
			<CardHeaderBar
				color={meta.color}
				billable={!!meta.isBillable}
				canEdit={canEdit}
				completed={completed}
				onToggleBillable={() => save('meta.isBillable', !meta.isBillable)}
				onOpenActivity={() => setDialog('activity')}
				onCopyLink={() => copyLink(card._id)}
				onChangeColor={() => setDialog('color')}
				onToggleCompleted={() => main && complete(card._id, main.id, !completed)}
				onArchive={() => setDialog('archive')}
			/>
			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
				{error ? (
					<View style={styles.error}>
						<Text style={{ color: COLORS.red }}>{error}</Text>
					</View>
				) : null}
				<CardTop
					hasCustomer={!!meta.customerId}
					customerName={customerName}
					completed={completed}
					canEdit={canEdit && !!main}
					onPickCustomer={customerId => save('meta.customerId', customerId)}
					onToggleCompleted={() => main && complete(card._id, main.id, !completed)}
				/>
				<Editable
					canEdit={canEdit}
					value={card.title}
					title={I18n.t('Exentriq_Card_Title')}
					multiline
					onSave={text => text.trim() && save('title', text.trim())}>
					<Text style={styles.title}>{card.title}</Text>
				</Editable>
				{card.createdAt ? (
					<Text style={styles.created}>
						{I18n.t('Exentriq_Card_Created')} {creator?.name || creator?.username || 'N/A'} {I18n.t('Exentriq_Card_On')}{' '}
						{formatCardDateTime(card.createdAt)}
					</Text>
				) : null}
				<CardMeta meta={meta} canEdit={canEdit} onSave={(path, value) => save(path, value)} onPickEta={() => setDialog('eta')} />
				<CardPeople
					members={members}
					responsible={responsible}
					canEdit={canEdit}
					ownerId={card.userId}
					onAdd={(added, asResponsible) => run(() => ema.addMember(card._id, added.id, asResponsible))}
					onRemoveMember={removed => run(() => ema.removeMember(card._id, removed.id))}
					onRemoveResponsible={people =>
						run(() =>
							ema.removeResponsible(
								card._id,
								people.map(item => item.id)
							)
						)
					}
				/>
				<CardDescription description={meta.description} canEdit={canEdit} onSave={value => save('meta.description', value)} />
				<CardTasks
					lists={taskLists}
					itemsCount={itemsCount}
					completedCount={meta.completedItemsCount ?? 0}
					canEdit={canEdit}
					onAddTask={(listId, title) => run(() => ema.addTask(card._id, listId, title))}
					onAddList={title => run(() => ema.addList(card._id, title))}
					{...taskActions}
				/>
				<CardLabels
					labels={labels}
					boardLabels={boardLabels}
					canEdit={canEdit}
					canManage={canManageLabels}
					onToggle={labelId => run(() => ema.toggleLabel(card._id, labelId))}
					onCreate={(title, color) =>
						run(() => (boardId ? ema.createLabel(boardId, title, color) : Promise.reject(new Error('error-exentriq-no-board'))))
					}
					onUpdate={(labelId, title, color) => run(() => ema.updateLabel(labelId, title, color))}
				/>
				<CardLinks
					cardId={card._id}
					placement={JSON.stringify(parents.map(parent => [parent.id, parent.listId, parent.closed, parent.archived]))}
				/>
				<CardCalendar
					events={events}
					canEdit={canEdit}
					onAdd={fields => run(() => ema.addEvent(card._id, fields))}
					onUpdate={(eventId, fields) => run(() => ema.updateEvent(eventId, fields))}
					onRemove={eventId => run(() => ema.removeEvent(eventId))}
				/>
				<CardTasks
					approval
					lists={approvalLists}
					itemsCount={0}
					completedCount={0}
					canEdit={canEdit}
					onAddTask={(listId, title) => run(() => ema.addTask(card._id, listId, title, true))}
					onAddList={title => run(() => ema.addList(card._id, title, true))}
					{...taskActions}
				/>
				<CardAttachments
					attachments={attachments}
					canEdit={canEdit}
					coverId={meta.coverId}
					urlOf={ema.attachmentUrl}
					onCover={attachmentId => run(() => ema.setCover(card._id, attachmentId))}
					onUpload={file => run(() => ema.uploadFile(card._id, file))}
					onRemove={attachment => run(() => ema.removeAttachment(attachment._id))}
				/>
			</ScrollView>
			{dialog === 'activity' ? (
				<ActivitySheet cardId={card._id} boardId={main?.id} canEdit={canEdit} onClose={() => setDialog(undefined)} />
			) : null}
			{dialog === 'color' ? (
				<ColorSheet
					onPick={hex => {
						setDialog(undefined);
						save('meta.color', hex);
					}}
					onClose={() => setDialog(undefined)}
				/>
			) : null}
			{dialog === 'archive' ? (
				<ConfirmSheet
					title={I18n.t('Exentriq_Card_Archive_activity')}
					message={I18n.t('Exentriq_Card_Archive_activity_confirm', { name: card.title })}
					confirmLabel={I18n.t('Exentriq_Card_Archive')}
					onConfirm={() => {
						setDialog(undefined);
						run(async () => {
							await ema.archiveEntity(card._id, main?.id);
							navigation.goBack();
						});
					}}
					onClose={() => setDialog(undefined)}
				/>
			) : null}
			{dialog === 'eta' ? (
				<Sheet title={I18n.t('Exentriq_Card_ETA')} onClose={() => setDialog(undefined)}>
					<DateTimePicker
						value={meta.eta ? new Date(meta.eta) : new Date()}
						mode='date'
						display='inline'
						onChange={(_, date) => {
							setDialog(undefined);
							if (date) {
								date.setHours(12, 0, 0, 0);
								save('meta.eta', date);
							}
						}}
					/>
					{meta.eta ? (
						<WideButton
							label={I18n.t('Exentriq_Card_Remove')}
							danger
							onPress={() => {
								setDialog(undefined);
								save('meta.eta', undefined);
							}}
						/>
					) : null}
				</Sheet>
			) : null}
			{choice ? (
				<Sheet
					title={I18n.t(choice.done ? 'Exentriq_Card_Select_closed_list' : 'Exentriq_Card_Select_list', {
						board: choice.lists.boardTitle
					})}
					onClose={() => setChoice(undefined)}>
					{choice.lists.lists.map(list => (
						<WideButton
							key={list._id}
							label={list.title}
							onPress={() => {
								const picked = choice;
								setChoice(undefined);
								complete(picked.entityId, picked.parentId, picked.done, { ...picked.prefer, [picked.lists.boardId]: list._id });
							}}
						/>
					))}
				</Sheet>
			) : null}
		</SafeAreaView>
	);
};

export default CardDetailsView;
