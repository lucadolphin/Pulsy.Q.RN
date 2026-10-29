import { getMeetRoomUrl } from './meetConfig';

jest.mock('~/lib/store/auxStore', () => ({
	store: { getState: () => ({ settings: { URL_MEET: 'https://meet.example.com/' } }) }
}));

describe('getMeetRoomUrl', () => {
	it('joins the ExMeet room of the call on the configured domain, muted', () => {
		expect(getMeetRoomUrl('abc123')).toBe('https://meet.example.com/ExMeet_abc123#config.startWithVideoMuted=true');
	});

	it('carries the name of the user', () => {
		expect(getMeetRoomUrl('abc123', 'Luca Inglese')).toBe(
			'https://meet.example.com/ExMeet_abc123#config.startWithVideoMuted=true&userInfo.displayName=%22Luca%20Inglese%22'
		);
	});
});
