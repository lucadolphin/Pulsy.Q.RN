// Change ENVIRONMENT to point every Exentriq AvatarService URL at staging, local or production.
export type TAvatarEnvironment = 'staging' | 'local' | 'production';

export const ENVIRONMENT: TAvatarEnvironment = 'staging';

const AVATAR_SERVICE_HOSTS: Record<TAvatarEnvironment, string> = {
	staging: 'https://stage.exentriq.com',
	local: 'http://localhost:8080',
	production: 'https://www.exentriq.com'
};

const host = AVATAR_SERVICE_HOSTS[ENVIRONMENT];

export const avatarConfig = {
	APP_NAME: 'talk',
	avatarPathUrl: `${host}/AvatarService?username=`,
	groupAvatarPathUrl: `${host}/AvatarService?groupId=`
};
