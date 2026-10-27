import { type ReactElement } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import styles from './styles';
import { type IEmoji } from '~/definitions/IEmoji';
import { Emoji } from './Emoji';
import Touch from '../Touch';
import useShortnameToUnicode from '~/lib/hooks/useShortnameToUnicode';
import {
	beginStickerDrag,
	dragOverZone,
	dragX,
	dragY,
	endStickerDrag,
	isOverChat,
	sendSticker,
	stickerText
} from '~/custom/talk/stickerDrag'; // TALK

const LONG_PRESS_MS = 250;

export const PressableEmoji = ({
	emoji,
	onPress,
	draggable = false
}: {
	emoji: IEmoji;
	onPress: (emoji: IEmoji) => void;
	// Held and dragged into the chat, it is sent as a sticker (IOS/Talk26)
	draggable?: boolean;
}): ReactElement => {
	const accessibilityLabel = typeof emoji === 'string' ? emoji : emoji.name;
	const { height } = useWindowDimensions();
	const { top } = useSafeAreaInsets();
	const { formatShortnameToUnicode } = useShortnameToUnicode();

	const begin = () => beginStickerDrag(emoji);
	const drop = (inZone: boolean) => {
		if (inZone) {
			sendSticker(stickerText(emoji, formatShortnameToUnicode));
		}
		endStickerDrag();
	};

	// The position goes straight to shared values on the UI thread; only the start and the drop reach JS
	const drag = Gesture.Pan()
		.activateAfterLongPress(LONG_PRESS_MS)
		.onStart(event => {
			'worklet';

			dragX.value = event.absoluteX;
			dragY.value = event.absoluteY;
			dragOverZone.value = isOverChat(event.absoluteY, height, top);
			scheduleOnRN(begin);
		})
		.onUpdate(event => {
			'worklet';

			dragX.value = event.absoluteX;
			dragY.value = event.absoluteY;
			dragOverZone.value = isOverChat(event.absoluteY, height, top);
		})
		.onEnd(event => {
			'worklet';

			scheduleOnRN(drop, isOverChat(event.absoluteY, height, top));
		})
		.onFinalize((_, success) => {
			'worklet';

			if (!success) {
				scheduleOnRN(endStickerDrag);
			}
		});

	const tap = Gesture.Tap().onEnd((_, success) => {
		'worklet';

		if (success) {
			scheduleOnRN(onPress, emoji);
		}
	});

	// Touch is a native button, which takes the touch at once and would never let the drag start: a plain view with
	// both gestures instead, the drag first
	if (draggable) {
		return (
			<GestureDetector gesture={Gesture.Exclusive(drag, tap)}>
				<View
					accessible
					accessibilityRole='button'
					accessibilityLabel={accessibilityLabel}
					style={styles.emojiButton}
					testID={`emoji-${accessibilityLabel}`}>
					<Emoji emoji={emoji} />
				</View>
			</GestureDetector>
		);
	}

	return (
		<Touch
			accessible
			accessibilityLabel={accessibilityLabel}
			key={typeof emoji === 'string' ? emoji : emoji.name}
			onPress={() => onPress(emoji)}
			style={styles.emojiButton}
			testID={`emoji-${typeof emoji === 'string' ? emoji : emoji.name}`}>
			<Emoji emoji={emoji} />
		</Touch>
	);
};
