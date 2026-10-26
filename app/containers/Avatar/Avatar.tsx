import { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { settings as RocketChatSettings } from '@rocket.chat/sdk';

import Emoji from '../markdown/components/emoji/Emoji';
import { getAvatarURL } from '~/lib/methods/helpers/getAvatarUrl';
import { headers } from '~/lib/methods/helpers/fetch';
import { SubscriptionType } from '~/definitions';
import { type IAvatar } from './interfaces';
import I18n from '~/i18n';
import Touch from '../Touch';
import { useExentriqAvatar } from '~/custom/talk/exentriqAvatar'; // TALK

const Avatar = memo(
	({
		server,
		style,
		avatar,
		children,
		userId,
		token,
		onPress,
		emoji,
		avatarETag,
		isStatic,
		rid,
		blockUnauthenticatedAccess,
		serverVersion,
		text,
		size = 25,
		borderRadius = 4,
		type = SubscriptionType.DIRECT,
		avatarExternalProviderUrl,
		roomAvatarExternalProviderUrl,
		cdnPrefix,
		accessibilityLabel,
		accessible = true
	}: IAvatar) => {
		// TALK: picture from Exentriq's AvatarService; without one, the letter avatar below stays
		const exentriqAvatar = useExentriqAvatar({ type, text, rid }, !avatar && !isStatic && !emoji);
		if ((!text && !avatar && !emoji && !rid) || !server) {
			return null;
		}

		const avatarAccessibilityLabel = accessibilityLabel ?? I18n.t('Avatar_Photo', { username: text });
		const avatarStyle = {
			width: size,
			height: size,
			borderRadius
		};

		let image;
		if (emoji) {
			image = (
				<Emoji
					block={{ type: 'EMOJI', value: { type: 'PLAIN_TEXT', value: emoji }, shortCode: emoji }}
					style={avatarStyle}
					isAvatar={true}
				/>
			);
		} else {
			let uri = avatar;
			if (exentriqAvatar) {
				uri = exentriqAvatar;
			} else if (!isStatic) {
				uri = getAvatarURL({
					type,
					text,
					size,
					userId,
					token,
					avatar,
					server,
					avatarETag,
					serverVersion,
					rid,
					blockUnauthenticatedAccess,
					avatarExternalProviderUrl,
					roomAvatarExternalProviderUrl,
					cdnPrefix
				});
			}

			image = (
				<Image
					style={avatarStyle}
					source={{
						uri,
						headers: RocketChatSettings.customHeaders ?? headers
					}}
					priority='high'
				/>
			);
		}

		if (onPress) {
			image = (
				<Touch accessible={accessible} accessibilityLabel={avatarAccessibilityLabel} onPress={onPress}>
					{image}
				</Touch>
			);
		}

		return (
			<View
				accessible={accessible}
				accessibilityLabel={!onPress ? avatarAccessibilityLabel : undefined}
				style={[avatarStyle, style]}
				testID='avatar'>
				{image}
				{children}
			</View>
		);
	}
);

export default Avatar;
