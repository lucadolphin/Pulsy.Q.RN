import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import I18n from '~/i18n';
import { CustomIcon } from '~/containers/CustomIcon';
import { useActionSheet } from '~/containers/ActionSheet';
import { addActivity, getActivitiesTotal } from '../emaActions';
import { type EmaCard } from '../types';
import { useEmaActivities, useEmaCustomerSearch } from '../useEmaSearch';
import {
	Chip,
	COLORS,
	LABEL_COLORS,
	PlusButton,
	Row,
	Sheet,
	WideButton,
	cardText,
	inputStyle,
	useDebounced,
	Editable
} from './ui';

type THeaderProps = {
	color?: string;
	billable: boolean;
	canEdit: boolean;
	completed: boolean;
	onToggleBillable: () => void;
	onOpenActivity: () => void;
	onCopyLink: () => void;
	onChangeColor: () => void;
	onToggleCompleted: () => void;
	onArchive: () => void;
};

/** The bar of ROMEO's card detail: billable, activity, link and the card's menu. */
export const CardHeaderBar = ({
	color,
	billable,
	canEdit,
	completed,
	onToggleBillable,
	onOpenActivity,
	onCopyLink,
	onChangeColor,
	onToggleCompleted,
	onArchive
}: THeaderProps) => {
	const { showActionSheet } = useActionSheet();
	const openMenu = () =>
		showActionSheet({
			options: [
				{ title: I18n.t('Exentriq_Card_Copy_link'), icon: 'link', onPress: onCopyLink },
				...(canEdit
					? [
							{ title: I18n.t('Exentriq_Card_Change_color'), icon: 'edit' as const, onPress: onChangeColor },
							{
								title: completed ? I18n.t('Exentriq_Card_Open') : I18n.t('Exentriq_Card_Close'),
								icon: 'check' as const,
								onPress: onToggleCompleted
							},
							{ title: I18n.t('Exentriq_Card_Archive'), icon: 'delete' as const, danger: true, onPress: onArchive }
						]
					: [])
			]
		});

	return (
		<View style={[styles.header, { backgroundColor: color || COLORS.headerTeal }]}>
			<TouchableOpacity
				disabled={!canEdit}
				onPress={onToggleBillable}
				style={[styles.button, billable && styles.buttonActive]}
				accessibilityLabel={I18n.t('Exentriq_Card_Billable')}
				accessibilityState={{ selected: billable }}>
				<Text style={styles.dollar}>$</Text>
			</TouchableOpacity>
			<TouchableOpacity onPress={onOpenActivity} style={styles.button} accessibilityLabel={I18n.t('Exentriq_Card_Activity')}>
				<CustomIcon name='clock' size={22} color={COLORS.white} />
			</TouchableOpacity>
			<TouchableOpacity onPress={onCopyLink} style={styles.button} accessibilityLabel={I18n.t('Exentriq_Card_Copy_link')}>
				<CustomIcon name='link' size={22} color={COLORS.white} />
			</TouchableOpacity>
			<TouchableOpacity onPress={openMenu} style={styles.button} accessibilityLabel={I18n.t('Exentriq_Card_Card_menu')}>
				<CustomIcon name='kebab' size={22} color={COLORS.white} />
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	header: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
	button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
	buttonActive: { backgroundColor: '#ffffff40' },
	dollar: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
	top: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
	wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
	swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
	swatch: { width: 44, height: 44, borderRadius: 22 },
	activityLine: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }
});

/** Customer on the left, "Mark as completed" on the right. */
export const CardTop = ({
	customerName,
	hasCustomer,
	completed,
	canEdit,
	onPickCustomer,
	onToggleCompleted
}: {
	customerName?: string;
	hasCustomer: boolean;
	completed: boolean;
	canEdit: boolean;
	onPickCustomer: (customerId: number | string) => void;
	onToggleCompleted: () => void;
}) => {
	const [picking, setPicking] = useState(false);
	return (
		<View style={styles.top}>
			<Chip label={I18n.t('Exentriq_Card_Customer')}>
				{hasCustomer ? (
					<Text style={cardText.normal}>{customerName ?? '…'}</Text>
				) : canEdit ? (
					<PlusButton label={I18n.t('Exentriq_Card_Add_customer')} onPress={() => setPicking(true)} />
				) : null}
			</Chip>
			<Chip
				label={completed ? I18n.t('Exentriq_Card_Mark_as_incomplete') : I18n.t('Exentriq_Card_Mark_as_completed')}
				onPress={canEdit ? onToggleCompleted : undefined}>
				<CustomIcon
					name={completed ? 'checkbox-checked' : 'checkbox-unchecked'}
					size={22}
					color={completed ? COLORS.primary : COLORS.textLight}
				/>
			</Chip>
			{picking ? (
				<CustomerPicker
					onPick={customerId => {
						setPicking(false);
						onPickCustomer(customerId);
					}}
					onClose={() => setPicking(false)}
				/>
			) : null}
		</View>
	);
};

const PAGE = 20;

const CustomerPicker = ({ onPick, onClose }: { onPick: (customerId: number | string) => void; onClose: () => void }) => {
	const [term, setTerm] = useState('');
	const [limit, setLimit] = useState(PAGE);
	const { customers, total, loading } = useEmaCustomerSearch(useDebounced(term), limit);
	return (
		<Sheet title={I18n.t('Exentriq_Card_Add_customer')} onClose={onClose}>
			<TextInput
				autoFocus
				value={term}
				onChangeText={value => {
					setTerm(value);
					setLimit(PAGE);
				}}
				placeholder={I18n.t('Exentriq_Card_Search')}
				style={inputStyle}
			/>
			{loading && !customers.length ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
			{!loading && !customers.length ? (
				<Text style={[cardText.light, { marginTop: 12 }]}>{I18n.t('Exentriq_Card_No_customers')}</Text>
			) : null}
			{customers.map(customer => (
				<Row key={String(customer.id)} onPress={() => onPick(customer.id)}>
					<Text style={cardText.normal}>{customer.name}</Text>
					{customer.email ? <Text style={cardText.light}>{customer.email}</Text> : null}
				</Row>
			))}
			{customers.length < total ? (
				<WideButton label={I18n.t('Exentriq_Card_Load_more')} onPress={() => setLimit(limit + PAGE)} />
			) : null}
		</Sheet>
	);
};

/** The colour of the bar of the card, picked from EMA's ten. */
export const ColorSheet = ({ onPick, onClose }: { onPick: (hex: string) => void; onClose: () => void }) => (
	<Sheet title={I18n.t('Exentriq_Card_Change_color')} onClose={onClose}>
		<View style={styles.swatches}>
			{Object.entries(LABEL_COLORS).map(([name, hex]) => (
				<TouchableOpacity
					key={name}
					onPress={() => onPick(hex)}
					style={[styles.swatch, { backgroundColor: hex }]}
					accessibilityLabel={name}
				/>
			))}
		</View>
	</Sheet>
);

/** Colour thresholds of ROMEO's chips: green below 50, orange up to 79, red from 80; progress reads the other way round. */
const colorByPoints = (points: number, inverse = false): string => {
	if (points >= 80) {
		return inverse ? COLORS.green : COLORS.red;
	}
	if (points >= 50) {
		return COLORS.orange;
	}
	return inverse ? COLORS.red : COLORS.green;
};

const pad = (value: number) => String(value).padStart(2, '0');
export const formatCardDate = (date: Date | string): string => {
	const value = new Date(date);
	return `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}`;
};
export const formatCardDateTime = (date: Date | string): string => {
	const value = new Date(date);
	const hours = value.getHours();
	return `${formatCardDate(value)}, ${pad(hours % 12 || 12)}:${pad(value.getMinutes())} ${hours < 12 ? 'am' : 'pm'}`;
};

const toNumber = (text: string): number | undefined =>
	text.trim() === '' || Number.isNaN(Number(text)) ? undefined : Number(text);
const toText = (text: string): string | undefined => (text.trim() === '' ? undefined : text.trim());

/** Priority, Progress, Effort, Budget and ETA: the grey chips under the title, editable like ROMEO's. */
export const CardMeta = ({
	meta,
	canEdit,
	onSave,
	onPickEta
}: {
	meta: NonNullable<EmaCard['meta']>;
	canEdit: boolean;
	onSave: (path: string, value: unknown) => void;
	onPickEta: () => void;
}) => {
	const points = Number(meta.points) || 0;
	const progress = Number(meta.progress) || 0;
	const chip = (
		label: string,
		display: string | number,
		value: string,
		path: string,
		parse: (text: string) => unknown,
		color?: string
	) => (
		<Editable canEdit={canEdit} value={value} title={label} keyboardType='numeric' onSave={text => onSave(path, parse(text))}>
			<Chip label={label}>
				<Text style={[cardText.normal, color ? { color } : null]}>{display}</Text>
			</Chip>
		</Editable>
	);
	return (
		<View style={styles.wrap}>
			{chip(I18n.t('Exentriq_Card_Priority'), points, String(points), 'meta.points', toNumber, colorByPoints(points))}
			{chip(
				I18n.t('Exentriq_Card_Progress'),
				`${progress}%`,
				String(progress),
				'meta.progress',
				toNumber,
				colorByPoints(progress, true)
			)}
			{chip(I18n.t('Exentriq_Card_Effort'), meta.effort || 0, String(meta.effort ?? ''), 'meta.effort', toText)}
			{chip(I18n.t('Exentriq_Card_Budget'), meta.budget || 0, String(meta.budget ?? ''), 'meta.budget', toText)}
			<Chip label={I18n.t('Exentriq_Card_ETA')} onPress={canEdit ? onPickEta : undefined}>
				<Text style={cardText.normal}>{meta.eta ? formatCardDate(meta.eta) : I18n.t('Exentriq_Card_Not_available')}</Text>
			</Chip>
		</View>
	);
};

/** Time logged on the card, with the form that logs more ("1d 4h 10m for the activity"). */
export const ActivitySheet = ({
	cardId,
	boardId,
	canEdit,
	onClose
}: {
	cardId: string;
	boardId?: string;
	canEdit: boolean;
	onClose: () => void;
}) => {
	const { entries, ready } = useEmaActivities(cardId, true);
	const [line, setLine] = useState('');
	const [total, setTotal] = useState('');
	const [error, setError] = useState<string>();

	const refreshTotal = () => getActivitiesTotal(cardId).then(setTotal, () => undefined);
	useEffect(() => {
		refreshTotal();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const submit = async () => {
		setError(undefined);
		try {
			await addActivity(cardId, boardId, line);
			setLine('');
			refreshTotal();
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<Sheet title={I18n.t('Exentriq_Card_Activity')} onClose={onClose}>
			{total ? <Text style={cardText.label}>{I18n.t('Exentriq_Card_Activity_total', { total })}</Text> : null}
			{canEdit ? (
				<>
					<TextInput
						value={line}
						onChangeText={setLine}
						onSubmitEditing={submit}
						placeholder='1d 4h 10m for the activity'
						returnKeyType='done'
						style={[inputStyle, { marginTop: 8 }]}
					/>
					{error ? <Text style={{ color: COLORS.red, marginTop: 4 }}>{error}</Text> : null}
				</>
			) : null}
			{!ready ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
			{ready && !entries.length ? (
				<Text style={[cardText.light, { marginTop: 12 }]}>{I18n.t('Exentriq_Card_No_activity')}</Text>
			) : null}
			{entries.map(entry => (
				<View key={entry._id} style={styles.activityLine}>
					<Text style={cardText.normal}>
						{[entry.days ? `${entry.days}d` : '', entry.hours ? `${entry.hours}h` : '', entry.minutes ? `${entry.minutes}m` : '']
							.filter(Boolean)
							.join(' ')}{' '}
						{entry.description}
					</Text>
					<Text style={cardText.light}>
						{entry.userName} · {entry.time ? formatCardDateTime(entry.time) : ''}
					</Text>
				</View>
			))}
		</Sheet>
	);
};
