import { getAttachmentPreview } from './RoomItem';

jest.mock('~/i18n', () => ({ __esModule: true, default: { t: (key: string) => key } }));

const message = (props: object) => ({ msg: '', ...props }) as Parameters<typeof getAttachmentPreview>[0];

describe('getAttachmentPreview', () => {
	it('has no preview without a file', () => {
		expect(getAttachmentPreview(message({}))).toBeNull();
	});

	it('shows an image by its caption, or its name when there is none', () => {
		expect(getAttachmentPreview(message({ attachments: [{ image_url: '/a.png' }] }))).toEqual({ icon: 'image', label: 'Image' });
		expect(getAttachmentPreview(message({ msg: ' Holiday ', attachments: [{ image_url: '/a.png' }] }))).toEqual({
			icon: 'image',
			label: 'Holiday'
		});
	});

	it('shows audio without the caption', () => {
		expect(getAttachmentPreview(message({ msg: 'x', attachments: [{ audio_url: '/a.aac' }] }))).toEqual({
			icon: 'mic',
			label: 'Audio'
		});
	});

	it('shows the file name of other files without the upload prefix', () => {
		expect(
			getAttachmentPreview(message({ attachments: [{ title: 'File Uploaded: sample.pdf', type: 'application/pdf' }] }))
		).toEqual({ icon: 'attach', label: 'sample.pdf' });
	});
});
