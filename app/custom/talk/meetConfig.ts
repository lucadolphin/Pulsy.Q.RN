import { store } from '~/lib/store/auxStore';

// The Jitsi of the ROMEO meet calls, which the Talk app joins as ExMeet_<call id>
const DEFAULT_MEET_DOMAIN = 'app004exe.exentriq.com';
export const MEET_ROOM_PREFIX = 'ExMeet_';

export const getMeetDomain = (): string => {
	const configured = (store?.getState?.()?.settings as Record<string, unknown> | undefined)?.URL_MEET;
	const domain =
		typeof configured === 'string'
			? configured
					.trim()
					.replace(/^https?:\/\//i, '')
					.replace(/\/+$/, '')
			: '';
	return domain || DEFAULT_MEET_DOMAIN;
};

/** Address of a ROMEO meet call, opened muted with the name of the user */
export const getMeetRoomUrl = (callId: string, displayName?: string): string => {
	const name = displayName ? `&userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}` : '';
	return `https://${getMeetDomain()}/${MEET_ROOM_PREFIX}${callId}#config.startWithVideoMuted=true${name}`;
};
