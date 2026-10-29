import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
	Animated,
	Easing,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	type TextStyle
} from 'react-native';

import I18n from '~/i18n';
import { CustomIcon, type TIconsName } from '~/containers/CustomIcon';
import Avatar from '~/containers/Avatar';
import { useUserPreferences } from '~/lib/methods/userPreferences';

export const COLORS = {
	primary: '#1bbc9b',
	text: '#4a4a4a',
	textLight: '#aaaaaa',
	grey: '#f5f5f5',
	border: '#e5e5e5',
	red: '#f3565d',
	orange: '#ff6b00',
	green: '#3cb500',
	headerTeal: '#3f9199',
	white: '#ffffff'
};

/** The ten colours a label can have in EMA, by name, as the shared UI kit paints them. */
export const LABEL_COLORS: Record<string, string> = {
	green: '#3cb500',
	yellow: '#fad900',
	orange: '#ff9f19',
	red: '#eb4646',
	purple: '#a632db',
	blue: '#00c2e0',
	sky: '#0079bf',
	lime: '#ff6b00',
	pink: '#ff78cb',
	black: '#4d4d4d'
};
/** EMA's flat UI colour names, which older cards keep in `meta.color` ("nephritis"), next to hex values and the label colours. */
const NAMED_COLORS: Record<string, string> = {
	...LABEL_COLORS,
	turquoise: '#1abc9c',
	emerald: '#2ecc71',
	'peter-river': '#3498db',
	amethyst: '#9b59b6',
	'wet-asphalt': '#34495e',
	'green-sea': '#16a085',
	nephritis: '#27ae60',
	'belize-hole': '#2980b9',
	wisteria: '#8e44ad',
	'midnight-blue': '#2c3e50',
	'sun-flower': '#f1c40f',
	carrot: '#e67e22',
	alizarin: '#e74c3c',
	clouds: '#ecf0f1',
	concrete: '#95a5a6',
	pumpkin: '#d35400',
	pomegranate: '#c0392b',
	silver: '#bdc3c7',
	asbestos: '#7f8c8d'
};

/** The colour of a card's bar: its `meta.color` as a name or a hex value, teal when it has none. */
export const resolveCardColor = (color?: string): string =>
	(color && (NAMED_COLORS[color.toLowerCase()] ?? color)) || COLORS.headerTeal;

export const colorOfLabel = (name?: string): string => (name && LABEL_COLORS[name]) || COLORS.primary;

export const cardText: Record<'label' | 'small' | 'normal' | 'light', TextStyle> = {
	label: { fontSize: 15, fontWeight: '700', color: COLORS.text },
	small: { fontSize: 13, fontWeight: '700', color: COLORS.text },
	normal: { fontSize: 15, color: COLORS.text },
	light: { fontSize: 14, color: COLORS.textLight }
};

/** A grey block with a bold label and a minus/plus toggler, as ROMEO's `entity-detail__block` sections. */
export const CardIdContext = createContext('');

export const CardBlock = ({
	id,
	label,
	children,
	right
}: {
	id: string;
	label: string;
	children: ReactNode;
	right?: ReactNode;
}) => {
	// Kept per task, so a panel reopens the way it was left
	const cardId = useContext(CardIdContext);
	const [collapsed, setCollapsed] = useUserPreferences<boolean>(`exentriq_card_collapsed_${cardId}_${id}`, false);
	const open = !collapsed;
	const setOpen = (value: boolean) => setCollapsed(value ? undefined : true);
	return (
		<View style={blockStyles.block}>
			<TouchableOpacity
				onPress={() => setOpen(!open)}
				style={blockStyles.head}
				accessibilityRole='button'
				accessibilityState={{ expanded: open }}>
				<Text style={[cardText.label, { flex: 1 }]}>{label}</Text>
				{right}
				<View style={blockStyles.toggle}>
					<CustomIcon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.text} />
				</View>
			</TouchableOpacity>
			{open ? <View style={blockStyles.body}>{children}</View> : null}
		</View>
	);
};

const blockStyles = StyleSheet.create({
	// The grey box reaches past the content column, so the text inside lines up with the title above
	block: {
		// Darker than the screen behind it, so the section stands out
		backgroundColor: '#e4e6e9',
		borderRadius: 6,
		marginTop: 12,
		marginHorizontal: -12,
		paddingHorizontal: 12,
		paddingVertical: 10
	},
	head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
	// Round like the plus buttons, in a tone close to the block's own background
	toggle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#d5d8dc',
		alignItems: 'center',
		justifyContent: 'center'
	},
	body: { marginTop: 8 }
});

/** The small grey chips under the title (customer, priority, ETA...). */
export const Chip = ({ label, children, onPress }: { label: string; children: ReactNode; onPress?: () => void }) => (
	<TouchableOpacity disabled={!onPress} onPress={onPress} style={chipStyles.chip} accessibilityLabel={label}>
		<Text style={cardText.small}>{label}</Text>
		{children}
	</TouchableOpacity>
);

const chipStyles = StyleSheet.create({
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		// Darker than the panel's own grey, so the chip stands out from it
		backgroundColor: '#e4e6e9',
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 6
	}
});

/** The three dots of a menu: round like the plus buttons, with a background that barely shows. */
export const KebabButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
	<TouchableOpacity onPress={onPress} style={kebabStyles.button} accessibilityLabel={label} accessibilityRole='button'>
		<CustomIcon name='kebab' size={20} color={COLORS.text} />
	</TouchableOpacity>
);

const kebabStyles = StyleSheet.create({
	button: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#d5d8dc', alignItems: 'center', justifyContent: 'center' }
});

/** The round button of the panel: green with a plus to add, red with a bin to remove. */
export const PlusButton = ({
	label,
	onPress,
	size = 32,
	tone = 'primary'
}: {
	label: string;
	onPress: () => void;
	size?: number;
	tone?: 'primary' | 'danger';
}) => (
	<TouchableOpacity
		onPress={onPress}
		style={[
			plusStyles.button,
			{ width: size, height: size, borderRadius: size / 2 },
			tone === 'danger' && { backgroundColor: COLORS.red }
		]}
		accessibilityLabel={label}
		accessibilityRole='button'>
		<CustomIcon
			name={tone === 'danger' ? 'delete' : 'add'}
			size={Math.round(size * (tone === 'danger' ? 0.55 : 0.6))}
			color={COLORS.white}
		/>
	</TouchableOpacity>
);

const plusStyles = StyleSheet.create({
	button: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center'
	}
});

export const WideButton = ({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) => (
	<TouchableOpacity
		onPress={onPress}
		style={[wideStyles.button, danger && { backgroundColor: COLORS.red }]}
		accessibilityRole='button'>
		<Text style={wideStyles.text}>{label}</Text>
	</TouchableOpacity>
);

const wideStyles = StyleSheet.create({
	button: { backgroundColor: COLORS.primary, borderRadius: 6, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
	text: { color: COLORS.white, fontWeight: '700', fontSize: 15 }
});

export const AVATAR_SIZE = 32;

/** A round button with just an icon, for the actions on a person: ROMEO's green, or the red of removing. */
export const IconButton = ({
	icon,
	label,
	tone = 'primary',
	onPress
}: {
	icon: TIconsName;
	label: string;
	tone?: 'primary' | 'danger';
	onPress: () => void;
}) => (
	<TouchableOpacity
		onPress={onPress}
		accessibilityLabel={label}
		accessibilityRole='button'
		style={[iconButtonStyles.button, { backgroundColor: tone === 'danger' ? '#fdecec' : COLORS.primary }]}>
		<CustomIcon name={icon} size={20} color={tone === 'danger' ? COLORS.red : COLORS.white} />
	</TouchableOpacity>
);

const iconButtonStyles = StyleSheet.create({
	button: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }
});

export const PersonAvatar = ({ username, size = AVATAR_SIZE }: { username?: string; size?: number }) => (
	<Avatar text={username ?? '?'} size={size} borderRadius={size / 2} />
);

/** A bottom sheet over the panel for a form or a list. */
/** A bottom sheet over the panel for a form or a list: the backdrop fades in place, only the sheet slides. */
export const Sheet = ({
	title,
	onClose,
	children,
	scroll = true,
	fixed = false
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	scroll?: boolean;
	/** Keeps the sheet at its full height whatever it lists, so it does not resize while a search changes the list. */
	fixed?: boolean;
}) => {
	const offset = useRef(new Animated.Value(SHEET_TRAVEL)).current;
	useEffect(() => {
		Animated.timing(offset, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
	}, [offset]);

	return (
		<Modal transparent animationType='fade' onRequestClose={onClose}>
			<Pressable style={sheetStyles.backdrop} onPress={onClose} />
			<Animated.View style={[sheetStyles.sheet, fixed && sheetStyles.fixed, { transform: [{ translateY: offset }] }]}>
				<View style={sheetStyles.head}>
					<Text style={[cardText.label, { flex: 1, fontSize: 17 }]}>{title}</Text>
					<TouchableOpacity onPress={onClose} accessibilityLabel={I18n.t('Close')}>
						<CustomIcon name='close' size={22} color={COLORS.text} />
					</TouchableOpacity>
				</View>
				{scroll ? <ScrollView keyboardShouldPersistTaps='handled'>{children}</ScrollView> : children}
			</Animated.View>
		</Modal>
	);
};

const SHEET_TRAVEL = 600;

const sheetStyles = StyleSheet.create({
	fixed: { height: '80%' },
	backdrop: { flex: 1, backgroundColor: '#00000066' },
	sheet: {
		backgroundColor: COLORS.white,
		maxHeight: '80%',
		borderTopLeftRadius: 14,
		borderTopRightRadius: 14,
		padding: 16,
		paddingBottom: 32
	},
	head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 }
});

export const inputStyle: TextStyle = {
	borderWidth: 1,
	borderColor: COLORS.border,
	borderRadius: 6,
	paddingHorizontal: 10,
	paddingVertical: 8,
	fontSize: 15,
	color: COLORS.text
};

/** Edits one value in a sheet, as ROMEO edits in place. */
export const TextSheet = ({
	title,
	value,
	multiline,
	keyboardType,
	onSave,
	onClose
}: {
	title: string;
	value: string;
	multiline?: boolean;
	keyboardType?: 'default' | 'numeric';
	onSave: (text: string) => void;
	onClose: () => void;
}) => {
	const [text, setText] = useState(value);
	return (
		<Sheet title={title} onClose={onClose}>
			<TextInput
				autoFocus
				value={text}
				onChangeText={setText}
				multiline={multiline}
				keyboardType={keyboardType}
				style={[inputStyle, multiline && { minHeight: 120, textAlignVertical: 'top' }]}
			/>
			<WideButton
				label={I18n.t('Save')}
				onPress={() => {
					onSave(text);
					onClose();
				}}
			/>
		</Sheet>
	);
};

/** A value that opens a sheet to be edited, when the person may edit. */
export const Editable = ({
	canEdit,
	value,
	title,
	multiline,
	keyboardType,
	onSave,
	children
}: {
	canEdit: boolean;
	value: string;
	title: string;
	multiline?: boolean;
	keyboardType?: 'default' | 'numeric';
	onSave: (text: string) => void;
	children: ReactNode;
}) => {
	const [editing, setEditing] = useState(false);
	return (
		<>
			<TouchableOpacity disabled={!canEdit} onPress={() => setEditing(true)} accessibilityLabel={title}>
				{children}
			</TouchableOpacity>
			{editing ? (
				<TextSheet
					title={title}
					value={value}
					multiline={multiline}
					keyboardType={keyboardType}
					onSave={onSave}
					onClose={() => setEditing(false)}
				/>
			) : null}
		</>
	);
};

export const ConfirmSheet = ({
	title,
	message,
	confirmLabel,
	onConfirm,
	onClose
}: {
	title: string;
	message: string;
	confirmLabel: string;
	onConfirm: () => void;
	onClose: () => void;
}) => (
	<Sheet title={title} onClose={onClose} scroll={false}>
		<Text style={cardText.normal}>{message}</Text>
		<WideButton label={confirmLabel} danger onPress={onConfirm} />
	</Sheet>
);

export const Row = ({ icon, children, onPress }: { icon?: TIconsName; children: ReactNode; onPress?: () => void }) => (
	<TouchableOpacity disabled={!onPress} onPress={onPress} style={rowStyles.row}>
		{icon ? <CustomIcon name={icon} size={20} color={COLORS.text} /> : null}
		<View style={{ flex: 1 }}>{children}</View>
	</TouchableOpacity>
);

const rowStyles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }
});

/** The text of a search box, debounced so the publication is not asked on every key. */
export const useDebounced = (value: string, delay = 300): string => {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return debounced;
};
