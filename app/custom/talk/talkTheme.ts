/**
 * Design tokens of the Talk26 chat UI (Talk26/app/themes/mapColors.ts, ChatComposer/styles.ts and
 * MessageBubbleV2 styles), WhatsApp-like bubbles with Talk's pink as primary.
 * Light values are Talk26's; dark ones are derived so the app keeps working with the dark themes.
 */
import { Platform } from 'react-native';

export interface ITalkColors {
	primary: string;
	primaryDark: string;
	primaryLight: string;
	chatBackground: string;
	bubbleSent: string;
	bubbleReceived: string;
	bubbleText: string;
	bubbleTime: string;
	bubbleAuthor: string;
	statusRead: string;
	composerBar: string;
	composerInput: string;
	composerIcon: string;
	composerPlaceholder: string;
	typingDot: string;
	typingBubble: string;
}

// IOS/Talk26/app/themes/mapColors.ts (Talk's brand: teal `#1bbc9b`) and ChatComposer/styles.ts
const light: ITalkColors = {
	primary: '#1bbc9b',
	primaryDark: '#22907E',
	primaryLight: '#b1e1d7',
	chatBackground: '#EBF5F2',
	bubbleSent: '#b1e1d7',
	bubbleReceived: '#ffffff',
	bubbleText: '#232323',
	bubbleTime: '#9b9ca4',
	bubbleAuthor: '#22907E',
	statusRead: '#4caf50',
	composerBar: '#F0F2F5',
	composerInput: '#FFFFFF',
	composerIcon: '#54656F',
	composerPlaceholder: '#8696A0',
	typingDot: '#8696A0',
	typingBubble: '#FFFFFF'
};

const dark: ITalkColors = {
	...light,
	primary: '#1bbc9b',
	chatBackground: '#16201e',
	bubbleSent: '#1f4d44',
	bubbleReceived: '#262a30',
	bubbleText: '#e6e6e6',
	bubbleTime: '#8e949c',
	bubbleAuthor: '#5fd3bc',
	composerBar: '#1c1f24',
	composerInput: '#2a2e35',
	composerIcon: '#aab4bb',
	typingBubble: '#2a2e35'
};

export const getTalkColors = (theme: string): ITalkColors => (theme === 'light' ? light : dark);

export const BUBBLE_RADIUS = 8;
export const BUBBLE_TAIL_RADIUS = 4;
export const BUBBLE_PADDING_H = 8;
export const BUBBLE_MAX_WIDTH = '84%';

/** Light shadow shared by bubbles and the composer pill (Talk26 BUBBLE_SHADOW). */
export const BUBBLE_SHADOW = {
	shadowColor: '#000',
	shadowOffset: { width: 3, height: 2 },
	shadowOpacity: 0.08,
	shadowRadius: 2,
	elevation: Platform.OS === 'android' ? 1 : 2
};

export const COMPOSER_PILL_RADIUS = 22;

/** Talk26 image/video attachments are a fixed square (ImageMessageV2 `IMAGE_BOX`), rounded like the bubble. */
export const MEDIA_BOX = 200;
export const MEDIA_BOX_STYLE = {
	width: MEDIA_BOX,
	height: MEDIA_BOX,
	borderRadius: BUBBLE_RADIUS,
	overflow: 'hidden'
} as const;
