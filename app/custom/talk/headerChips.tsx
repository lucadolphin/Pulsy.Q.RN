import { createContext, type ReactNode, useContext } from 'react';
import { StyleSheet } from 'react-native';

// IOS/Talk26 ExHeaderV2 `FilterChip`: header buttons are 36px round chips over the background image
export const HEADER_CHIP_SIZE = 36;
export const HEADER_CHIP_ICON_SIZE = 22;

const HeaderChipContext = createContext(false);

export const HeaderChipProvider = ({ children }: { children: ReactNode }) => (
	<HeaderChipContext.Provider value>{children}</HeaderChipContext.Provider>
);

/** True inside the room header, where buttons are drawn as chips */
export const useHeaderChip = () => useContext(HeaderChipContext);

export const headerChipStyles = StyleSheet.create({
	chip: {
		width: HEADER_CHIP_SIZE,
		height: HEADER_CHIP_SIZE,
		borderRadius: HEADER_CHIP_SIZE / 2,
		marginHorizontal: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.08)'
	}
});
