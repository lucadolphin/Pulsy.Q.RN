import { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { CustomIcon } from '~/containers/CustomIcon';
import { useTheme } from '~/theme';
import { getTalkColors } from '~/custom/talk/talkTheme'; // TALK
import Touch from '~/containers/Touch';
import { EDGE_DISTANCE } from '../constants';
import i18n from '~/i18n';

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		right: EDGE_DISTANCE,
		bottom: EDGE_DISTANCE
	},
	button: {
		borderRadius: 25,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5
	},
	content: {
		width: 50,
		height: 50,
		borderRadius: 25,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center'
	}
});

const NavBottomFAB = ({ visible, onPress }: { visible: boolean; onPress: () => void }): ReactElement | null => {
	const { theme, colors } = useTheme();
	// The room's `surfaceRoom` is transparent (the chat pattern shows through): the button takes the bubble color
	const background = getTalkColors(theme).bubbleReceived;

	if (!visible) {
		return null;
	}

	return (
		<View style={styles.container}>
			<Touch
				accessible
				accessibilityLabel={i18n.t('Jump_to_last_message')}
				onPress={() => onPress()}
				style={[styles.button, { backgroundColor: background }]}
				testID='nav-jump-to-bottom'>
				<View style={[styles.content, { borderColor: colors.strokeLight }]}>
					<CustomIcon name='chevron-down' size={36} color={colors.fontDefault} />
				</View>
			</Touch>
		</View>
	);
};

export default NavBottomFAB;
