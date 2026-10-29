import * as DocumentPicker from 'expo-document-picker';

import I18n from '~/i18n';
import { IMAGE_PICKER_CONFIG, LIBRARY_PICKER_CONFIG, VIDEO_PICKER_CONFIG } from '~/containers/MessageComposer/constants';
import { forceJpgExtension } from '~/containers/MessageComposer/helpers';
import ImagePicker, { type ImageOrVideo } from '~/lib/methods/helpers/ImagePicker/ImagePicker';

export type PickedFile = { uri: string; name: string; type: string; size: number };

const labels = () => ({
	cropperChooseText: I18n.t('Choose'),
	cropperCancelText: I18n.t('Cancel'),
	loadingLabelText: I18n.t('Processing')
});

const fromMedia = (media: ImageOrVideo): PickedFile => ({
	uri: media.path,
	name: media.filename || media.path.split('/').pop() || 'attachment',
	type: media.mime,
	size: media.size
});

/** The same sources the chat's attach menu offers, each answering with the files picked (none when the person cancels). */
export const takePhoto = async (): Promise<PickedFile[]> => {
	const image = forceJpgExtension(await ImagePicker.openCamera({ ...IMAGE_PICKER_CONFIG, ...labels() }));
	return [fromMedia(image)];
};

export const takeVideo = async (): Promise<PickedFile[]> => [
	fromMedia(await ImagePicker.openCamera({ ...VIDEO_PICKER_CONFIG, ...labels() }))
];

export const chooseFromLibrary = async (): Promise<PickedFile[]> => {
	const media = (await ImagePicker.openPicker({ ...LIBRARY_PICKER_CONFIG, ...labels() })) as unknown as ImageOrVideo[];
	return media.map(item => fromMedia(forceJpgExtension(item)));
};

export const chooseFile = async (): Promise<PickedFile[]> => {
	const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false, multiple: true });
	if (result.canceled) {
		return [];
	}
	return result.assets.map(asset => ({
		uri: asset.uri,
		name: asset.name,
		type: asset.mimeType ?? 'application/octet-stream',
		size: asset.size ?? 0
	}));
};
