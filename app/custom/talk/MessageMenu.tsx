import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Mask, Path, Rect } from 'react-native-svg';

import { CustomIcon } from '~/containers/CustomIcon';
import I18n from '~/i18n';
import useShortnameToUnicode from '~/lib/hooks/useShortnameToUnicode';
import { computeMenuTop } from './messageMenuLayout';
import { setMessageMenuListener, type TMessageMenuPayload } from './messageMenuStore';

// IOS/Talk26 MessageOptionsV2: a reaction bar and a short menu next to the pressed bubble, over a dimmed chat
const ROW_H = 38;
const MENU_WIDTH = 190;
const SCREEN_MARGIN = 12;
const REACTION_BAR_H = 46;
const REACTION_ITEM_W = 34;
const REACTION_BAR_PAD = 12;
const STACK_GAP = 6;
const HEADER_FALLBACK = 56;
// The composer with its toolbar, which the menu must not cover
const COMPOSER_FALLBACK = 100;
// Rows shown before "More…": the rest is one tap away
const PRIMARY_ROWS = 5;
const MENU_ICON = '#54656F';
const MENU_TEXT = '#111B21';
const DESTRUCTIVE = '#E53935';

type TMenuRow = TMessageMenuPayload['options'][number] & { keepOpen?: boolean };

const MessageMenu = () => {
	const [payload, setPayload] = useState<TMessageMenuPayload | null>(null);
	const [expanded, setExpanded] = useState(false);
	const insets = useSafeAreaInsets();
	const { width: screenW, height: screenH } = useWindowDimensions();
	const { formatShortnameToUnicode } = useShortnameToUnicode();
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => setMessageMenuListener(setPayload), []);

	useEffect(() => {
		if (payload) {
			setExpanded(false);
			opacity.setValue(0);
			Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
		}
	}, [payload, opacity]);

	const close = useCallback(() => {
		setPayload(current => {
			current?.onClose?.();
			return null;
		});
	}, []);

	if (!payload) {
		return null;
	}

	const { anchor, isOwn, options: allOptions, quickReactions, onReaction, onMoreReactions } = payload;
	// The first rows, then "More…" for the rest; inside the rest, "Back" returns to the first ones
	const splitList = allOptions.length > PRIMARY_ROWS + 1;
	const rows: TMenuRow[] = !splitList
		? allOptions
		: expanded
			? [
					{
						title: I18n.t('Back'),
						icon: 'chevron-left',
						keepOpen: true,
						testID: 'message-actions-back',
						onPress: () => setExpanded(false)
					},
					...allOptions.slice(PRIMARY_ROWS)
				]
			: [
					...allOptions.slice(0, PRIMARY_ROWS),
					{
						title: I18n.t('More_options'),
						icon: 'chevron-right',
						keepOpen: true,
						testID: 'message-actions-more',
						onPress: () => setExpanded(true)
					}
				];
	// The bar stays over "More…" too, and with it the width of the menu
	const hasBar = !!quickReactions?.length && !!onReaction;
	const barWidth = hasBar ? (quickReactions!.length + 1) * REACTION_ITEM_W + REACTION_BAR_PAD : 0;
	const width = Math.min(Math.max(MENU_WIDTH, barWidth), screenW - SCREEN_MARGIN * 2);
	const barBlock = hasBar ? REACTION_BAR_H + 8 : 0;
	const chatTop = insets.top + HEADER_FALLBACK + SCREEN_MARGIN;
	const chatBottom = screenH - insets.bottom - COMPOSER_FALLBACK - SCREEN_MARGIN;
	// A long list scrolls inside the card instead of leaving the chat area
	const cardH = Math.min(rows.length * ROW_H, chatBottom - chatTop - barBlock);
	const totalH = barBlock + cardH;
	const top = computeMenuTop({
		anchorY: anchor.y,
		anchorHeight: anchor.height,
		totalHeight: totalH,
		chatTop,
		chatBottom,
		gap: STACK_GAP
	});
	const left = Math.max(
		SCREEN_MARGIN,
		Math.min(isOwn ? anchor.x + anchor.width - width : anchor.x, screenW - width - SCREEN_MARGIN)
	);

	// The bubble stays where it is, uncovered: the backdrop is a dim layer with the shape of the bubble cut out of it
	const { radii, x, y, width: bubbleW, height: bubbleH } = anchor;
	const cutout = [
		`M ${x + radii.tl} ${y}`,
		`H ${x + bubbleW - radii.tr}`,
		`A ${radii.tr} ${radii.tr} 0 0 1 ${x + bubbleW} ${y + radii.tr}`,
		`V ${y + bubbleH - radii.br}`,
		`A ${radii.br} ${radii.br} 0 0 1 ${x + bubbleW - radii.br} ${y + bubbleH}`,
		`H ${x + radii.bl}`,
		`A ${radii.bl} ${radii.bl} 0 0 1 ${x} ${y + bubbleH - radii.bl}`,
		`V ${y + radii.tl}`,
		`A ${radii.tl} ${radii.tl} 0 0 1 ${x + radii.tl} ${y}`,
		'Z'
	].join(' ');

	const select = (run?: () => void, keepOpen = false) => {
		if (!keepOpen) {
			close();
		}
		run?.();
	};

	return (
		<Modal visible transparent animationType='none' onRequestClose={close} statusBarTranslucent>
			<View style={StyleSheet.absoluteFill}>
				<Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents='none'>
					<Svg width={screenW} height={screenH}>
						<Defs>
							<Mask id='highlight'>
								<Rect width={screenW} height={screenH} fill='white' />
								<Path d={cutout} fill='black' />
							</Mask>
						</Defs>
						<Rect width={screenW} height={screenH} fill='rgba(0, 0, 0, 0.45)' mask='url(#highlight)' />
					</Svg>
				</Animated.View>
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={close}
					accessibilityRole='button'
					accessibilityLabel={I18n.t('Close')}
				/>
				<Animated.View style={[styles.menu, { top, left, width, opacity }]}>
					{hasBar ? (
						<View style={styles.bar}>
							{quickReactions!.map(shortname => (
								<Pressable
									key={shortname}
									style={styles.barItem}
									onPress={() => select(() => onReaction?.(shortname))}
									testID={`message-actions-emoji-${shortname}`}
									accessibilityRole='button'>
									<Text style={styles.barEmoji}>{formatShortnameToUnicode(shortname)}</Text>
								</Pressable>
							))}
							<Pressable
								style={styles.barItem}
								onPress={() => select(onMoreReactions)}
								testID='message-actions-emoji-add'
								accessibilityRole='button'
								accessibilityLabel={I18n.t('Add_reaction')}>
								<Ionicons name='add-circle-outline' size={26} color={MENU_ICON} />
							</Pressable>
						</View>
					) : null}
					<ScrollView style={[styles.card, { maxHeight: cardH }]} bounces={false}>
						{rows.map((option, index) => {
							const enabled = option.enabled !== false;
							const color = option.danger ? DESTRUCTIVE : MENU_TEXT;
							return (
								<Pressable
									key={`${option.title}-${index}`}
									style={[styles.row, !enabled && styles.rowDisabled]}
									disabled={!enabled}
									onPress={() => select(option.onPress, option.keepOpen)}
									testID={option.testID}
									accessibilityRole='button'
									accessibilityLabel={option.accessibilityLabel ?? option.title}>
									<Text numberOfLines={1} style={[styles.label, { color }]}>
										{option.title}
									</Text>
									{option.icon ? (
										<CustomIcon name={option.icon} size={18} color={option.danger ? DESTRUCTIVE : MENU_ICON} />
									) : null}
									{index < rows.length - 1 ? <View style={styles.divider} pointerEvents='none' /> : null}
								</Pressable>
							);
						})}
					</ScrollView>
				</Animated.View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	menu: {
		position: 'absolute'
	},
	bar: {
		height: REACTION_BAR_H,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		borderRadius: REACTION_BAR_H / 2,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: REACTION_BAR_PAD / 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 6
	},
	barItem: {
		width: REACTION_ITEM_W,
		height: REACTION_ITEM_W,
		alignItems: 'center',
		justifyContent: 'center'
	},
	barEmoji: {
		fontSize: 24
	},
	card: {
		borderRadius: 14,
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 6
	},
	row: {
		height: ROW_H,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 14
	},
	rowDisabled: {
		opacity: 0.4
	},
	label: {
		flex: 1,
		marginRight: 12,
		fontSize: 14
	},
	divider: {
		position: 'absolute',
		left: 14,
		right: 14,
		bottom: 0,
		height: StyleSheet.hairlineWidth,
		backgroundColor: 'rgba(0, 0, 0, 0.08)'
	}
});

export default MessageMenu;
