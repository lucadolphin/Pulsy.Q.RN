import { memo, type ReactElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BorderlessButton } from 'react-native-gesture-handler';

import { CustomIcon, type TIconsName } from '~/containers/CustomIcon';
import { useTheme } from '~/theme';
import sharedStyles from '~/views/Styles';
import { headerChipStyles, HEADER_CHIP_ICON_SIZE, useHeaderChip } from '~/custom/talk/headerChips'; // TALK

export interface IHeaderButtonItem {
	title?: string;
	iconName?: TIconsName;
	onPress?: <T>(arg: T) => void;
	testID?: string;
	badge?(): ReactElement | null;
	color?: string;
	disabled?: boolean;
	accessibilityLabel?: string;
}

export const BUTTON_HIT_SLOP = {
	top: 5,
	right: 5,
	bottom: 5,
	left: 5
};

const styles = StyleSheet.create({
	container: {
		padding: 6
	},
	title: {
		...Platform.select({
			android: {
				fontSize: 14
			},
			default: {
				fontSize: 17
			}
		}),
		...sharedStyles.textRegular
	}
});

const Item = memo(
	({
		title,
		iconName,
		onPress,
		testID,
		badge,
		color,
		disabled,
		accessibilityLabel,
		...props
	}: IHeaderButtonItem): ReactElement => {
		const { colors } = useTheme();
		const chip = useHeaderChip();
		return (
			<BorderlessButton
				onPress={onPress}
				testID={testID}
				hitSlop={BUTTON_HIT_SLOP}
				enabled={!disabled}
				style={chip ? headerChipStyles.chip : styles.container}>
				<View
					accessible
					accessibilityLabel={accessibilityLabel}
					style={{
						opacity: disabled ? 0.5 : 1
					}}>
					{iconName ? (
						<CustomIcon name={iconName} size={chip ? HEADER_CHIP_ICON_SIZE : 24} color={color} {...props} />
					) : (
						<Text style={[styles.title, { color: color || colors.fontDefault }]} {...props}>
							{title}
						</Text>
					)}
					{badge ? badge() : null}
				</View>
			</BorderlessButton>
		);
	}
);

Item.displayName = 'HeaderButton.Item';

export default Item;
