import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { goRoom } from '~/lib/methods/helpers/goRoom';
import { useMasterDetail } from '~/lib/hooks/useMasterDetail';
import { SubscriptionType } from '~/definitions';

import I18n from '~/i18n';
import { getPaths } from '../emaActions';
import { useEmaUserSearch } from '../useEmaSearch';
import {
	AVATAR_SIZE,
	CardBlock,
	COLORS,
	ConfirmSheet,
	Editable,
	IconButton,
	PersonAvatar,
	PlusButton,
	Row,
	Sheet,
	WideButton,
	cardText,
	inputStyle,
	useDebounced
} from './ui';
import { Linking } from 'react-native';

export type Person = { id: string; username?: string; name?: string; email?: string };

const nameOf = (person: Person) => person.name || person.username || '';

const AVATAR_GAP = 8;
const OVERLAP = 12;

const styles = StyleSheet.create({
	group: { backgroundColor: COLORS.white, borderRadius: 6, padding: 10, marginTop: 8 },
	// The content on the left, its button (add, remove) pushed to the right edge of the area
	areaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
	areaContent: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
	person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	path: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
	stack: { flexDirection: 'row', alignItems: 'center' },
	overlap: { marginLeft: -OVERLAP },
	more: {
		width: AVATAR_SIZE,
		height: AVATAR_SIZE,
		borderRadius: AVATAR_SIZE / 2,
		marginLeft: -OVERLAP,
		backgroundColor: COLORS.grey,
		alignItems: 'center',
		justifyContent: 'center'
	},
	popupBackdrop: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
	popup: { width: 300, backgroundColor: COLORS.white, borderRadius: 8, padding: 16, alignItems: 'center' },
	popupName: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 16 },
	popupActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
	memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
	memberRowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }
});

/** How many avatars fit side by side in the space left by the plus button; more than that and the group turns compact. */
const fitting = (width: number) => Math.floor((width + AVATAR_GAP) / (AVATAR_SIZE + AVATAR_GAP));

/** How many overlapping avatars fit in the compact group, leaving room for its "+n" chip. */
const fittingCompact = (width: number) => Math.max(1, Math.floor((width - AVATAR_SIZE) / (AVATAR_SIZE - OVERLAP)));

/** ROMEO's member card: a large picture, the name and round icon buttons: send a message, start a call and, for who may, remove. */
const MemberPopup = ({
	person,
	canRemove,
	onMessage,
	onCall,
	onRemove,
	onClose
}: {
	person: Person;
	canRemove: boolean;
	onMessage: () => void;
	onCall: () => void;
	onRemove: () => void;
	onClose: () => void;
}) => (
	<Modal transparent animationType='fade' onRequestClose={onClose}>
		<Pressable style={styles.popupBackdrop} onPress={onClose}>
			<Pressable style={styles.popup}>
				<PersonAvatar username={person.username} size={140} />
				<Text style={styles.popupName} numberOfLines={1}>
					{nameOf(person)}
				</Text>
				<View style={styles.popupActions}>
					<IconButton icon='message' label={I18n.t('Exentriq_Card_Send_message')} onPress={onMessage} />
					<IconButton icon='phone' label={I18n.t('Exentriq_Card_Start_call')} onPress={onCall} />
					{canRemove ? (
						<IconButton icon='delete' tone='danger' label={I18n.t('Exentriq_Card_Remove')} onPress={onRemove} />
					) : null}
				</View>
			</Pressable>
		</Pressable>
	</Modal>
);

/** Everyone on the card, one per row with their name or, lacking it, their email, and the buttons to message, call and remove them. */
const MembersSheet = ({
	members,
	ownerId,
	canEdit,
	onMessage,
	onCall,
	onRemove,
	onAdd,
	onClose
}: {
	members: Person[];
	ownerId?: string;
	canEdit: boolean;
	onMessage: (person: Person) => void;
	onCall: (person: Person) => void;
	onRemove: (person: Person) => void;
	onAdd: () => void;
	onClose: () => void;
}) => (
	<Sheet title={`${I18n.t('Exentriq_Card_Members')} (${members.length})`} onClose={onClose}>
		{members.map(person => (
			<View key={person.id} style={styles.memberRow}>
				<PersonAvatar username={person.username} />
				<Text style={[cardText.normal, { flex: 1 }]} numberOfLines={1}>
					{person.name || person.email || person.username}
				</Text>
				<View style={styles.memberRowActions}>
					<IconButton icon='message' label={I18n.t('Exentriq_Card_Send_message')} onPress={() => onMessage(person)} />
					<IconButton icon='phone' label={I18n.t('Exentriq_Card_Start_call')} onPress={() => onCall(person)} />
					{canEdit && person.id !== ownerId ? (
						<IconButton icon='delete' tone='danger' label={I18n.t('Exentriq_Card_Remove')} onPress={() => onRemove(person)} />
					) : null}
				</View>
			</View>
		))}
		{canEdit ? <WideButton label={I18n.t('Exentriq_Card_Add_members')} onPress={onAdd} /> : null}
	</Sheet>
);

const PAGE = 20;

const PersonPicker = ({
	title,
	excludeIds,
	onPick,
	onClose
}: {
	title: string;
	excludeIds: string[];
	onPick: (person: Person) => void;
	onClose: () => void;
}) => {
	const [term, setTerm] = useState('');
	const [limit, setLimit] = useState(PAGE);
	const { people, total, loading } = useEmaUserSearch(useDebounced(term), limit);
	const visible = people.filter(person => !excludeIds.includes(person.id));
	return (
		<Sheet title={title} onClose={onClose} fixed>
			<TextInput
				autoFocus
				value={term}
				onChangeText={value => {
					setTerm(value);
					setLimit(PAGE);
				}}
				placeholder={I18n.t('Exentriq_Card_Search_people')}
				style={inputStyle}
			/>
			{loading && !visible.length ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
			{!loading && !visible.length ? (
				<Text style={[cardText.light, { marginTop: 12 }]}>{I18n.t('Exentriq_Card_No_people')}</Text>
			) : null}
			{visible.map(person => (
				<Row key={person.id} onPress={() => onPick(person)}>
					<View style={styles.person}>
						<PersonAvatar username={person.username} />
						<View>
							<Text style={cardText.normal}>{nameOf(person)}</Text>
							{person.email ? <Text style={cardText.light}>{person.email}</Text> : null}
						</View>
					</View>
				</Row>
			))}
			{people.length < total ? (
				<WideButton label={I18n.t('Exentriq_Card_Load_more')} onPress={() => setLimit(limit + PAGE)} />
			) : null}
		</Sheet>
	);
};

/** Responsible and Members, each in its own white block, inside the grey People block. */
export const CardPeople = ({
	members,
	responsible,
	canEdit,
	ownerId,
	onAdd,
	onRemoveMember,
	onRemoveResponsible
}: {
	members: Person[];
	responsible: Person[];
	canEdit: boolean;
	ownerId?: string;
	onAdd: (person: Person, responsible: boolean) => void;
	onRemoveMember: (person: Person) => void;
	onRemoveResponsible: (people: Person[]) => void;
}) => {
	const isMasterDetail = useMasterDetail();
	const [picking, setPicking] = useState<'member' | 'responsible'>();
	const [removing, setRemoving] = useState<Person>();
	const [opened, setOpened] = useState<Person>();
	const [listing, setListing] = useState(false);
	// The room the members have, measured: the avatars only turn into the compact group when they no longer fit
	const [membersWidth, setMembersWidth] = useState(0);
	const compact = membersWidth > 0 && members.length > fitting(membersWidth);
	// Overlapped, everyone may still fit without a counter; otherwise the counter takes the room of the last avatar
	const countHidden = members.length > fittingCompact(membersWidth) + 1;
	const visibleMembers = countHidden ? fittingCompact(membersWidth) : members.length;

	const openDirect = (person: Person) => {
		if (person.username) {
			goRoom({ item: { name: person.username, t: SubscriptionType.DIRECT }, isMasterDetail });
		}
	};

	const goDirect = (person: Person) => {
		setOpened(undefined);
		setListing(false);
		openDirect(person);
	};

	const avatar = (person: Person) => (
		<TouchableOpacity key={person.id} onPress={() => setOpened(person)} accessibilityLabel={nameOf(person)}>
			<PersonAvatar username={person.username} />
		</TouchableOpacity>
	);

	return (
		<CardBlock id='people' label={I18n.t('Exentriq_Card_People')}>
			<View style={styles.group}>
				<Text style={cardText.small}>{I18n.t('Exentriq_Card_Responsible')}</Text>
				<View style={styles.areaRow}>
					<View style={styles.areaContent}>
						{responsible.map(person => (
							<View key={person.id} style={styles.person}>
								{avatar(person)}
								<Text style={cardText.normal}>{nameOf(person)}</Text>
							</View>
						))}
					</View>
					{canEdit && responsible.length ? (
						<PlusButton
							tone='danger'
							size={AVATAR_SIZE}
							label={I18n.t('Exentriq_Card_Remove_responsible')}
							onPress={() => onRemoveResponsible(responsible)}
						/>
					) : null}
					{canEdit && !responsible.length ? (
						<PlusButton
							size={AVATAR_SIZE}
							label={I18n.t('Exentriq_Card_Add_responsible')}
							onPress={() => setPicking('responsible')}
						/>
					) : null}
				</View>
			</View>
			<View style={styles.group}>
				<Text style={cardText.small}>{I18n.t('Exentriq_Card_Members')}</Text>
				<View style={styles.areaRow}>
					<View style={styles.areaContent} onLayout={event => setMembersWidth(event.nativeEvent.layout.width)}>
						{compact ? (
							<TouchableOpacity
								style={styles.stack}
								onPress={() => setListing(true)}
								accessibilityLabel={I18n.t('Exentriq_Card_Show_members', { count: members.length })}>
								{members.slice(0, visibleMembers).map((person, index) => (
									<View key={person.id} style={index ? styles.overlap : undefined}>
										<PersonAvatar username={person.username} />
									</View>
								))}
								{countHidden ? (
									<View style={styles.more}>
										<Text style={cardText.small}>+{members.length - visibleMembers}</Text>
									</View>
								) : null}
							</TouchableOpacity>
						) : (
							members.map(avatar)
						)}
					</View>
					{canEdit ? (
						<PlusButton size={AVATAR_SIZE} label={I18n.t('Exentriq_Card_Add_member')} onPress={() => setPicking('member')} />
					) : null}
				</View>
			</View>
			{picking ? (
				<PersonPicker
					title={picking === 'responsible' ? I18n.t('Exentriq_Card_Add_responsible') : I18n.t('Exentriq_Card_Add_members')}
					excludeIds={members.map(member => member.id)}
					onClose={() => setPicking(undefined)}
					onPick={person => {
						onAdd(person, picking === 'responsible');
						setPicking(undefined);
					}}
				/>
			) : null}
			{listing && !picking ? (
				<MembersSheet
					members={members}
					ownerId={ownerId}
					canEdit={canEdit}
					onMessage={goDirect}
					onCall={goDirect}
					onRemove={person => {
						setListing(false);
						setRemoving(person);
					}}
					onAdd={() => setPicking('member')}
					onClose={() => setListing(false)}
				/>
			) : null}
			{opened ? (
				<MemberPopup
					person={opened}
					canRemove={canEdit && opened.id !== ownerId}
					onMessage={() => goDirect(opened)}
					onCall={() => goDirect(opened)}
					onRemove={() => {
						setOpened(undefined);
						setRemoving(opened);
					}}
					onClose={() => setOpened(undefined)}
				/>
			) : null}
			{removing ? (
				<ConfirmSheet
					title={I18n.t('Exentriq_Card_Remove')}
					message={I18n.t('Exentriq_Card_Remove_member_confirm', { name: nameOf(removing) })}
					confirmLabel={I18n.t('Exentriq_Card_Remove')}
					onConfirm={() => {
						onRemoveMember(removing);
						setRemoving(undefined);
					}}
					onClose={() => setRemoving(undefined)}
				/>
			) : null}
		</CardBlock>
	);
};

export const CardDescription = ({
	description,
	canEdit,
	onSave
}: {
	description?: string;
	canEdit: boolean;
	onSave: (value: string | undefined) => void;
}) => (
	<CardBlock id='description' label={I18n.t('Exentriq_Card_Description')}>
		<View style={styles.group}>
			<Editable
				canEdit={canEdit}
				value={description ?? ''}
				title={I18n.t('Exentriq_Card_Description')}
				multiline
				onSave={text => onSave(text.trim() || undefined)}>
				<Text style={description ? cardText.normal : cardText.light}>
					{description || I18n.t('Exentriq_Card_No_description_yet')}
				</Text>
			</Editable>
		</View>
	</CardBlock>
);

/** "Primary links": where the card lives, board by board and list by list, each step a link into EMA. */
export const CardLinks = ({ cardId, placement }: { cardId: string; placement: string }) => {
	const [path, setPath] = useState<{ name: string; link?: string }[]>([]);

	useEffect(() => {
		let cancelled = false;
		getPaths(cardId).then(
			steps => !cancelled && setPath(steps),
			() => !cancelled && setPath([])
		);
		return () => {
			cancelled = true;
		};
	}, [cardId, placement]);

	return (
		<CardBlock id='links' label={I18n.t('Exentriq_Card_Links')}>
			<View style={styles.group}>
				<Text style={cardText.small}>{I18n.t('Exentriq_Card_Primary_links')}</Text>
				<View style={[styles.path, { marginTop: 6 }]}>
					{path.map((step, index) => (
						<View key={`${step.name}-${index}`} style={styles.path}>
							{index > 0 ? <Text style={cardText.light}> \ </Text> : null}
							{step.link ? (
								<Text style={[cardText.normal, { color: COLORS.primary }]} onPress={() => Linking.openURL(step.link as string)}>
									{step.name}
								</Text>
							) : (
								<Text style={cardText.normal}>{step.name}</Text>
							)}
						</View>
					))}
				</View>
			</View>
		</CardBlock>
	);
};
