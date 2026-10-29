import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { goRoom } from '~/lib/methods/helpers/goRoom';
import { useMasterDetail } from '~/lib/hooks/useMasterDetail';
import { SubscriptionType } from '~/definitions';

import I18n from '~/i18n';
import { CustomIcon } from '~/containers/CustomIcon';
import { useActionSheet } from '~/containers/ActionSheet';
import { getPaths } from '../emaActions';
import { useEmaUserSearch } from '../useEmaSearch';
import {
	CardBlock,
	COLORS,
	ConfirmSheet,
	Editable,
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

const styles = StyleSheet.create({
	group: { backgroundColor: COLORS.white, borderRadius: 6, padding: 10, marginTop: 8 },
	wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
	person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	path: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }
});

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
		<Sheet title={title} onClose={onClose}>
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
	const { showActionSheet } = useActionSheet();
	const [picking, setPicking] = useState<'member' | 'responsible'>();
	const [removing, setRemoving] = useState<Person>();

	const openDirect = (person: Person) => {
		if (person.username) {
			goRoom({ item: { name: person.username, t: SubscriptionType.DIRECT }, isMasterDetail });
		}
	};

	const openPerson = (person: Person) =>
		showActionSheet({
			options: [
				{ title: I18n.t('Exentriq_Card_Send_message'), icon: 'message', onPress: () => openDirect(person) },
				...(canEdit && person.id !== ownerId
					? [{ title: I18n.t('Exentriq_Card_Remove'), icon: 'delete' as const, danger: true, onPress: () => setRemoving(person) }]
					: [])
			]
		});

	const avatar = (person: Person) => (
		<TouchableOpacity key={person.id} onPress={() => openPerson(person)} accessibilityLabel={nameOf(person)}>
			<PersonAvatar username={person.username} />
		</TouchableOpacity>
	);

	return (
		<CardBlock label={I18n.t('Exentriq_Card_People')}>
			<View style={styles.group}>
				<Text style={cardText.small}>{I18n.t('Exentriq_Card_Responsible')}</Text>
				<View style={styles.wrapRow}>
					{responsible.map(person => (
						<View key={person.id} style={styles.person}>
							{avatar(person)}
							<Text style={cardText.normal}>{nameOf(person)}</Text>
						</View>
					))}
					{canEdit && responsible.length ? (
						<TouchableOpacity
							onPress={() => onRemoveResponsible(responsible)}
							accessibilityLabel={I18n.t('Exentriq_Card_Remove_responsible')}>
							<CustomIcon name='delete' size={20} color={COLORS.red} />
						</TouchableOpacity>
					) : null}
					{canEdit && !responsible.length ? (
						<PlusButton label={I18n.t('Exentriq_Card_Add_responsible')} onPress={() => setPicking('responsible')} />
					) : null}
				</View>
			</View>
			<View style={styles.group}>
				<Text style={cardText.small}>{I18n.t('Exentriq_Card_Members')}</Text>
				<View style={styles.wrapRow}>
					{members.map(avatar)}
					{canEdit ? <PlusButton label={I18n.t('Exentriq_Card_Add_member')} onPress={() => setPicking('member')} /> : null}
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
	<CardBlock label={I18n.t('Exentriq_Card_Description')}>
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
		<CardBlock label={I18n.t('Exentriq_Card_Links')}>
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
