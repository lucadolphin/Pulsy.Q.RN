/**
 * Date of a rooms list row, as IOS/Talk26/app/utils/formatDate.js `utilityFormatDate`: today shows the time
 * (HH:mm, 24h), yesterday a label ("Ieri"), anything older DD/MM/YYYY. The reference is the last message of the
 * room (Talk26 keeps it in the subscription `ts`/`lm`), not the day weekdays or relative dates of Rocket.Chat.
 */
type TDateValue = Date | number | string | { $date: number } | null | undefined;

export const toDate = (value: TDateValue): Date | null => {
	if (value === null || value === undefined || value === '') {
		return null;
	}
	const raw = typeof value === 'object' && !(value instanceof Date) ? value.$date : value;
	const date = raw instanceof Date ? raw : new Date(raw as string | number);
	return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (n: number) => `${n}`.padStart(2, '0');

const sameDay = (a: Date, b: Date) =>
	a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

export const formatTalkDate = (value: TDateValue, yesterdayLabel: string, now: Date = new Date()): string => {
	const date = toDate(value);
	if (!date) {
		return '';
	}
	if (sameDay(date, now)) {
		return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (sameDay(date, yesterday)) {
		return yesterdayLabel;
	}
	return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
