import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle } from 'react-native';

import I18n from '~/i18n';
import { CustomIcon, type TIconsName } from '~/containers/CustomIcon';
import Avatar from '~/containers/Avatar';

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
export const colorOfLabel = (name?: string): string => (name && LABEL_COLORS[name]) || COLORS.primary;

export const cardText: Record<'label' | 'small' | 'normal' | 'light', TextStyle> = {
	label: { fontSize: 15, fontWeight: '700', color: COLORS.text },
	small: { fontSize: 13, fontWeight: '700', color: COLORS.text },
	normal: { fontSize: 15, color: COLORS.text },
	light: { fontSize: 14, color: COLORS.textLight }
};

/** A grey block with a bold label and a minus/plus toggler, as ROMEO's `entity-detail__block` sections. */
export const CardBlock = ({ label, children, right }: { label: string; children: ReactNode; right?: ReactNode }) => {
	const [open, setOpen] = useState(true);
	return (
		<View style={blockStyles.block}>
			<TouchableOpacity
				onPress={() => setOpen(!open)}
				style={blockStyles.head}
				accessibilityRole='button'
				accessibilityState={{ expanded: open }}>
				<Text style={[cardText.label, { flex: 1 }]}>{label}</Text>
				{right}
				<CustomIcon name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.text} />
			</TouchableOpacity>
			{open ? <View style={blockStyles.body}>{children}</View> : null}
		</View>
	);
};

const blockStyles = StyleSheet.create({
	block: { backgroundColor: COLORS.grey, borderRadius: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
	head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
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
		backgroundColor: COLORS.grey,
		borderRadius: 14,
		paddingHorizontal: 10,
		paddingVertical: 6
	}
});

export const PlusButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
	<TouchableOpacity onPress={onPress} style={plusStyles.button} accessibilityLabel={label} accessibilityRole='button'>
		<CustomIcon name='add' size={14} color={COLORS.white} />
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

export const PersonAvatar = ({ username, size = 32 }: { username?: string; size?: number }) => (
	<Avatar text={username ?? '?'} size={size} borderRadius={size / 2} />
);

/** A bottom sheet over the panel for a form or a list. */
export const Sheet = ({
	title,
	onClose,
	children,
	scroll = true
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
	scroll?: boolean;
}) => (
	<Modal transparent animationType='slide' onRequestClose={onClose}>
		<Pressable style={sheetStyles.backdrop} onPress={onClose} />
		<View style={sheetStyles.sheet}>
			<View style={sheetStyles.head}>
				<Text style={[cardText.label, { flex: 1, fontSize: 17 }]}>{title}</Text>
				<TouchableOpacity onPress={onClose} accessibilityLabel={I18n.t('Close')}>
					<CustomIcon name='close' size={22} color={COLORS.text} />
				</TouchableOpacity>
			</View>
			{scroll ? <ScrollView keyboardShouldPersistTaps='handled'>{children}</ScrollView> : children}
		</View>
	</Modal>
);

const sheetStyles = StyleSheet.create({
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
