/**
 * Aligns Rocket.Chat's color tokens with Talk's palette (IOS/Talk26/app/themes/mapColors.ts) by overriding the
 * brand ones in place, once, before the app renders, so upstream's `lib/constants/colors.ts` stays untouched.
 * Only the "blue" brand family is remapped (primary buttons, highlights, links, unread badge): neutrals, surfaces
 * and semantic colors (errors, warnings...) are left as upstream defines them.
 */
import { colors } from '~/lib/constants/colors';

type TOverrides = Partial<Record<keyof typeof colors.light, string>>;

const TALK_LIGHT: TOverrides = {
	strokeHighlight: '#1bbc9b',
	strokeExtraLightHighlight: '#E8F8F5',
	fontInfo: '#1bbc9b',
	statusFontInfo: '#22907E',
	statusBackgroundInfo: '#E8F8F5',
	badgeBackgroundLevel2: '#1bbc9b',
	buttonBackgroundPrimaryDefault: '#1bbc9b',
	buttonBackgroundPrimaryPress: '#22907E',
	buttonBackgroundPrimaryDisabled: '#b1e1d7'
};

// Same hue, darker so text/buttons keep their contrast on the dark surfaces
const TALK_DARK: TOverrides = {
	strokeHighlight: '#1bbc9b',
	strokeExtraLightHighlight: '#1f4d44',
	fontInfo: '#5fd3bc',
	statusFontInfo: '#5fd3bc',
	statusBackgroundInfo: '#1f4d44',
	badgeBackgroundLevel2: '#22907E',
	buttonBackgroundPrimaryDefault: '#22907E',
	buttonBackgroundPrimaryPress: '#1a6f61',
	buttonBackgroundPrimaryDisabled: '#1f4d44'
};

export const TALK_THEME_OVERRIDES = { light: TALK_LIGHT, dark: TALK_DARK, black: TALK_DARK };

let applied = false;

export const applyTalkTheme = () => {
	if (applied) {
		return;
	}
	applied = true;
	(['light', 'dark', 'black'] as const).forEach(theme => {
		Object.assign(colors[theme], TALK_THEME_OVERRIDES[theme]);
	});
};
