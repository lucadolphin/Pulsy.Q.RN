import { type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import I18n from '~/i18n';
import { formatSeparatorDate } from '~/lib/dayjs';
import { useTheme } from '~/theme';

// IOS/Talk26 DataSeparator: a small shadowed pill with the day, no lines
const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		marginVertical: 16
	},
	label: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 8,
		shadowColor: 'rgba(0, 0, 0, 0.4)',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.35,
		shadowRadius: 4.5,
		elevation: 5
	},
	text: {
		fontSize: 10,
		fontWeight: '700',
		textAlign: 'center'
	}
});

export const DateSeparatorLabel = ({ ts }: { ts: Date | string }): ReactElement => {
	const { theme, colors } = useTheme();
	const isLight = theme === 'light';

	return (
		<View style={[styles.label, { backgroundColor: isLight ? '#f0f0f0' : colors.buttonBackgroundSecondaryDefault }]}>
			<Text style={[styles.text, { color: isLight ? '#7f7f7f' : colors.buttonFontSecondary }]}>
				{formatSeparatorDate(ts, { today: I18n.t('Today'), yesterday: I18n.t('Yesterday') })}
			</Text>
		</View>
	);
};

const DateSeparator = ({ ts }: { ts: Date | string }): ReactElement => (
	<View style={styles.container}>
		<DateSeparatorLabel ts={ts} />
	</View>
);

export default DateSeparator;
