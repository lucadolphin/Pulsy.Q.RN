import { type ReactElement } from 'react';
import { Text } from 'react-native';

import i18n from '~/i18n';
import { getMeetRoomUrl } from '~/custom/talk/meetConfig';
import { useAppSelector } from '~/lib/hooks/useAppSelector';
import Navigation from '~/lib/navigation/appNavigation';
import Touch from '~/containers/Touch';
import { CallParticipants, type TCallUsers } from './CallParticipants';
import useStyle from './styles';
import { VideoConferenceBaseContainer } from './VideoConferenceBaseContainer';

/** A call of the ROMEO era: a room of the Exentriq Jitsi that stays open to join, whatever its record says */
export default function VideoConferenceRomeo({
	callId,
	rid,
	users
}: {
	callId: string;
	rid: string;
	users: TCallUsers;
}): ReactElement {
	const style = useStyle();
	const displayName = useAppSelector(state => state.login.user.name || state.login.user.username);

	return (
		<VideoConferenceBaseContainer variant='meet'>
			<Touch
				style={style.callToActionButton}
				onPress={() => Navigation.navigate('JitsiMeetView', { rid, url: getMeetRoomUrl(callId, displayName), videoConf: true })}>
				<Text style={style.callToActionButtonText}>{i18n.t('Join')}</Text>
			</Touch>
			{users.length ? <CallParticipants users={users} /> : <></>}
		</VideoConferenceBaseContainer>
	);
}
