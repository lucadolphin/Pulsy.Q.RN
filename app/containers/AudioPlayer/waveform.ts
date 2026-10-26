/** Bars drawn in an audio message. */
export const WAVEFORM_DISPLAY_BARS = 36;

/** Bars drawn while recording. */
export const RECORDING_WAVEFORM_BARS = 28;

export const WAVEFORM_MIN_BAR = 3;
export const WAVEFORM_MAX_BAR = 24;

// Speech sits above about -45 dB: a lower floor would waste the bottom of the scale
const METERING_FLOOR_DB = -50;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Recorder metering (dB or 0-1) as an absolute amplitude between 0 and 1. */
export const normalizeMetering = (raw?: number): number => {
	if (raw == null || !Number.isFinite(raw)) return 0;
	if (raw >= 0 && raw <= 1) return raw;
	return (Math.max(METERING_FLOOR_DB, Math.min(0, raw)) - METERING_FLOOR_DB) / -METERING_FLOOR_DB;
};

/** Highest sample of each of the `buckets` windows. */
export const bucketPeaks = (samples: number[], buckets: number): number[] =>
	Array.from({ length: buckets }, (_, i) => {
		const start = Math.floor((i * samples.length) / buckets);
		const end = Math.max(start + 1, Math.floor(((i + 1) * samples.length) / buckets));
		return Math.max(0, ...samples.slice(start, end));
	});

// Min-max stretch: the metering of real speech is squeezed in a narrow high band, so the clip's own range is expanded
const stretchSamples = (samples: number[]): number[] => {
	const min = Math.min(...samples);
	const max = Math.max(...samples);
	const range = max - min;
	if (!Number.isFinite(range) || range < 0.05) {
		const flat = Math.max(0.15, Math.min(1, Number.isFinite(max) ? max : 0.15));
		return samples.map(() => flat);
	}
	return samples.map(value => Math.max(0.12, Math.min(1, Math.pow((value - min) / range, 0.72))));
};

const toHeight = (amplitude: number) => WAVEFORM_MIN_BAR + clamp01(amplitude) * (WAVEFORM_MAX_BAR - WAVEFORM_MIN_BAR);

/** Bar heights for amplitudes between 0 and 1. */
export const samplesToBarHeights = (samples: number[], barCount = WAVEFORM_DISPLAY_BARS): number[] => {
	if (!samples.length) return [];
	const stretched = stretchSamples(samples);
	return Array.from({ length: barCount }, (_, index) =>
		toHeight(stretched[Math.floor((index * stretched.length) / barCount)] ?? 0.12)
	);
};

/** Bars of the live waveform while recording. */
export const liveBarHeights = (samples: number[], barCount = RECORDING_WAVEFORM_BARS): number[] => {
	if (!samples.length) return Array.from({ length: barCount }, () => WAVEFORM_MIN_BAR);
	return samplesToBarHeights(bucketPeaks(samples, barCount).map(clamp01), barCount);
};

const hashString = (input: string): number => {
	let hash = 0;
	for (let i = 0; i < input.length; i += 1) {
		hash = (hash * 31 + input.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
};

/** Same bars every time for the same seed: used when the real amplitudes of the file are not known. */
export const fallbackBarHeights = (seed: string, barCount = WAVEFORM_DISPLAY_BARS): number[] => {
	let state = hashString(seed) || 1;
	return Array.from({ length: barCount }, () => {
		state = (state * 16807 + 1) % 2147483647;
		return toHeight(0.15 + (state % 1000) / 1000);
	});
};
