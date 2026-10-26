import { StyleSheet, View } from 'react-native';

import MessageTime from '~/containers/message/components/Time';
import RightIcons from '~/containers/message/components/RightIcons';
import MessageTicks from './MessageTicks';

/** Time and delivery status at the bottom right of a bubble (IOS/Talk26 InfoV2 inline) */
const BubbleMeta = () => (
	<View style={styles.metaInfo}>
		<RightIcons hideReadReceipt />
		<MessageTime style={styles.time} />
		<MessageTicks />
	</View>
);

const styles = StyleSheet.create({
	time: {
		fontSize: 11,
		lineHeight: 14
	},
	metaInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2
	}
});

export default BubbleMeta;
