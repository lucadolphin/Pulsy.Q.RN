import { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import Edited from './Edited';
import Encrypted from './Encrypted';
import MessageError from './MessageError';
import Pinned from './Pinned';
import ReadReceipt from './ReadReceipt';
import Translated from './Translated';

const styles = StyleSheet.create({
	actionIcons: {
		flexDirection: 'row'
	}
});

// The Talk bubble draws its own ticks after the time
const RightIcons = ({ hideReadReceipt }: { hideReadReceipt?: boolean }): ReactElement => {
	return (
		<View style={styles.actionIcons}>
			<Pinned />
			<Encrypted />
			<Edited />
			<MessageError />
			<Translated />
			{hideReadReceipt ? null : <ReadReceipt />}
		</View>
	);
};

export default RightIcons;
