import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
	type LayoutChangeEvent,
	type NativeSyntheticEvent,
	Platform,
	StyleSheet,
	Text,
	type TextLayoutEventData,
	View
} from 'react-native';

import markdownStyles from '~/containers/markdown/styles';

/** Gap between the last line of text and the time (IOS/Talk26 `INFO_PAD_LEFT`) */
const INFO_PAD_LEFT = 6;
const INLINE_SLACK = Platform.OS === 'android' ? 8 : 6;
const LINE_WIDTH_PAD = Platform.OS === 'android' ? 4 : 0;
const ESTIMATE_INFO = { w: 48, h: 18 };

const near = (a: number, b: number) => Math.abs(a - b) < 1.5;

interface ITextWithInlineTimeProps {
	children: ReactNode;
	/** Time and status icons */
	info: ReactNode;
	/** Message text, only used to measure its lines */
	text: string;
	/** Width available to the text inside the bubble (max width minus padding) */
	maxContentWidth: number;
}

/**
 * IOS/Talk26 `TextWithInlineTime`: one bubble without a column reserved for the time.
 * One short line: the time sits next to the text. More lines: the bubble shrinks to the longest line, and the
 * time goes at the bottom right of the last line when it fits there, or just under the text when it doesn't.
 */
const TextWithInlineTime = ({ children, info, text, maxContentWidth }: ITextWithInlineTimeProps) => {
	const textKey = `${text}|${maxContentWidth}`;
	const [infoSize, setInfoSize] = useState(ESTIMATE_INFO);
	const [layout, setLayout] = useState<{ key: string; last: number; max: number; lines: number } | null>(null);

	const measured = layout?.key === textKey ? layout : null;
	const lastW = measured ? measured.last + LINE_WIDTH_PAD : 0;
	const maxW = measured ? measured.max + LINE_WIDTH_PAD : 0;
	const infoW = infoSize.w + INFO_PAD_LEFT;

	const canFitInline = !!measured && lastW + infoW <= maxContentWidth - INLINE_SLACK;
	const useInlineRow = canFitInline && measured?.lines === 1;

	const fittedWidth = useMemo(() => {
		if (!measured || useInlineRow) {
			return undefined;
		}
		const next = canFitInline ? Math.max(maxW, lastW + infoW) : Math.max(maxW, infoW);
		return Math.min(maxContentWidth, Math.ceil(next) + 1);
	}, [measured, useInlineRow, canFitInline, maxW, lastW, infoW, maxContentWidth]);

	const onInfoLayout = useCallback((event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		if (width <= 0 || height <= 0) {
			return;
		}
		setInfoSize(prev => (near(prev.w, width) && near(prev.h, height) ? prev : { w: width, h: height }));
	}, []);

	const onMeasure = useCallback(
		(event: NativeSyntheticEvent<TextLayoutEventData>) => {
			const lines = event.nativeEvent.lines;
			if (!lines?.length) {
				return;
			}
			const max = Math.max(...lines.map(line => line.width));
			const last = lines[lines.length - 1].width;
			setLayout(prev =>
				prev?.key === textKey && near(prev.last, last) && near(prev.max, max) && prev.lines === lines.length
					? prev
					: { key: textKey, last, max, lines: lines.length }
			);
		},
		[textKey]
	);

	return (
		<View
			style={[
				styles.wrap,
				useInlineRow && styles.wrapInlineRow,
				{ maxWidth: maxContentWidth, minWidth: infoW },
				fittedWidth != null && { width: fittedWidth },
				// Before the measure the time goes under the text, so the first paint never covers it
				useInlineRow ? null : { paddingBottom: canFitInline ? 2 : Math.max(infoSize.h - 2, 12) }
			]}>
			<View style={useInlineRow ? styles.bodyInFlow : undefined}>{children}</View>
			<View pointerEvents='none' style={[styles.measureHost, { width: maxContentWidth }]}>
				<Text
					key={textKey}
					importantForAccessibility='no'
					style={[markdownStyles.text, styles.measureText]}
					onTextLayout={onMeasure}>
					{text}
				</Text>
			</View>
			<View style={useInlineRow ? styles.infoInFlow : styles.info} pointerEvents='box-none' onLayout={onInfoLayout}>
				{info}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		position: 'relative',
		alignSelf: 'flex-start'
	},
	// Stretch to the bubble: when the sender's name makes it wider, the time stays at the right edge
	wrapInlineRow: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	bodyInFlow: {
		flexShrink: 1
	},
	measureHost: {
		position: 'absolute',
		left: 0,
		top: 0,
		height: 0,
		overflow: 'hidden',
		opacity: 0
	},
	measureText: {
		color: 'transparent'
	},
	info: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		paddingLeft: INFO_PAD_LEFT
	},
	infoInFlow: {
		flexShrink: 0,
		marginLeft: 'auto',
		paddingLeft: INFO_PAD_LEFT
	}
});

export default TextWithInlineTime;
