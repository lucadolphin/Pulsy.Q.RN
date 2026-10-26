import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { type ReactElement } from 'react';

import Avatar from '~/containers/Avatar';
import { useAppNavigation } from '~/lib/hooks/navigation';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import { useMasterDetail } from '~/lib/hooks/useMasterDetail';
import { getUserSelector } from '~/selectors/login';
import { HeaderBackButton } from '~/containers/Header/components/HeaderBackButton';
import { useUnreadsCount } from '../hooks/useUnreadsCount';
import { useGoRoomActionsView } from '../hooks/useGoRoomActionsView';
import { useStore } from 'zustand';
import { type RoomStore } from '../definitions';
import { headerChipStyles, HEADER_CHIP_ICON_SIZE, useHeaderChip } from '~/custom/talk/headerChips'; // TALK
import I18n from '~/i18n';

const styles = StyleSheet.create({
	avatar: {
		borderRadius: 10
	},
	// The glyph of arrow-back-ios sits to the left of its box
	backIcon: {
		marginLeft: 5
	}
});

interface ILeftButtonsProps {
	rid?: string;
	tmid?: string;
	roomStore: RoomStore;
}

const LeftButtons = ({ rid, tmid, roomStore }: ILeftButtonsProps): ReactElement | null => {
	const { goBack } = useAppNavigation();
	const goRoomActionsView = useGoRoomActionsView(roomStore);
	const isMasterDetail = useMasterDetail();
	const baseUrl = useAppSelector(state => state.server.server);
	const { id: userId, token } = useAppSelector(getUserSelector);
	const t = useStore(roomStore, s => s.room.t);
	const title = useStore(roomStore, s => s.room.name);

	const onPress = () => goRoomActionsView();
	const { fontScale } = useWindowDimensions();
	const unreadsCount = useUnreadsCount(rid);
	const chip = useHeaderChip();

	if (chip && (!isMasterDetail || tmid)) {
		return (
			<Pressable
				onPress={goBack}
				style={headerChipStyles.chip}
				hitSlop={6}
				accessibilityRole='button'
				accessibilityLabel={I18n.t('Back')}
				testID='header-back'>
				<MaterialIcons name='arrow-back-ios' size={HEADER_CHIP_ICON_SIZE} color='#ffffff' style={styles.backIcon} />
			</Pressable>
		);
	}

	if (!isMasterDetail || tmid) {
		let label: string | undefined;
		let marginLeft = 0;
		let fontSize = 0;
		if (unreadsCount) {
			label = unreadsCount > 99 ? '+99' : unreadsCount.toString();
			const labelLength = label.length;
			marginLeft = -4 * labelLength;
			fontSize = labelLength > 1 ? 14 : 17;
		}
		return <HeaderBackButton label={label} onPress={goBack} labelStyle={{ fontSize: fontSize * fontScale, marginLeft }} />;
	}

	if (baseUrl && userId && token) {
		return <Avatar rid={rid} text={title} size={30} type={t} style={styles.avatar} onPress={onPress} />;
	}
	return null;
};

export default LeftButtons;
