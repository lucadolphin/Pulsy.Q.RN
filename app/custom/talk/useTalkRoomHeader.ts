import { useEffect, useLayoutEffect } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';

import { claimStatusBarBackground } from './statusBarBackground';
import { renderTalkRoomHeader, TALK_STATUS_BAR_BACKGROUND } from './TalkHeader';

/** The room header is Talk26's background.jpg too, and so is the strip behind the status bar while the room is open. */
export const useTalkRoomHeader = () => {
	const navigation = useNavigation();
	const isFocused = useIsFocused();

	useLayoutEffect(() => {
		navigation.setOptions({ header: renderTalkRoomHeader });
	}, [navigation]);

	useEffect(() => {
		if (!isFocused) {
			return;
		}
		return claimStatusBarBackground(TALK_STATUS_BAR_BACKGROUND);
	}, [isFocused]);
};
