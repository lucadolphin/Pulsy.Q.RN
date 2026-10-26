import { type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import I18n from '~/i18n';
import { useTheme } from '~/theme';
import { getTalkColors } from '~/custom/talk/talkTheme';

// IOS/Talk26 ConversationStartMarker
const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		paddingTop: 24,
		paddingBottom: 40,
		paddingHorizontal: 16,
		marginBottom: 24
	},
	iconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12
	},
	label: {
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '700'
	}
});

const ConversationStart = (): ReactElement => {
	const { theme, colors } = useTheme();
	const talk = getTalkColors(theme);

	return (
		<View style={styles.container} pointerEvents='none'>
			<View style={[styles.iconWrap, { backgroundColor: talk.primary }]}>
				<MaterialIcons name='star' size={24} color='#ffffff' />
			</View>
			<Text style={[styles.label, { color: colors.fontSecondaryInfo }]}>{I18n.t('Conversation_starts_here')}</Text>
		</View>
	);
};

export default ConversationStart;
