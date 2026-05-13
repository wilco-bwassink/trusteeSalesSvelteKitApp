export const MONTHS = [
	{ slug: 'january', label: 'January' },
	{ slug: 'february', label: 'February' },
	{ slug: 'march', label: 'March' },
	{ slug: 'april', label: 'April' },
	{ slug: 'may', label: 'May' },
	{ slug: 'june', label: 'June' },
	{ slug: 'july', label: 'July' },
	{ slug: 'august', label: 'August' },
	{ slug: 'september', label: 'September' },
	{ slug: 'october', label: 'October' },
	{ slug: 'november', label: 'November' },
	{ slug: 'december', label: 'December' }
] as const;

export type MonthOption = (typeof MONTHS)[number];
export type MonthSlug = MonthOption['slug'];

const monthsBySlug = new Map(MONTHS.map((month) => [month.slug, month]));
const slugsByLabel = new Map(MONTHS.map((month) => [month.label.toLowerCase(), month.slug]));

export function normalizeMonthSlug(value: string | null | undefined): MonthSlug | null {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) return null;

	if (monthsBySlug.has(normalized as MonthSlug)) {
		return normalized as MonthSlug;
	}

	return slugsByLabel.get(normalized) ?? null;
}

export function getMonthLabel(value: string | null | undefined): string {
	const slug = normalizeMonthSlug(value);
	return slug ? monthsBySlug.get(slug)!.label : '';
}

export function getMonthRoute(value: string | null | undefined): string {
	const slug = normalizeMonthSlug(value);
	return slug ? `/${slug}` : '';
}

export function getSaleYear(value: string | null | undefined): number | null {
	if (!value) return null;

	const trimmed = value.trim();
	const isoMatch = trimmed.match(/^(\d{4})-\d{1,2}-\d{1,2}$/);
	if (isoMatch) return Number(isoMatch[1]);

	const usMatch = trimmed.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/);
	if (usMatch) return Number(usMatch[1]);

	const fileMatch = trimmed.match(/^\d{1,2}-\d{1,2}-(\d{4})$/);
	if (fileMatch) return Number(fileMatch[1]);

	return null;
}

export function normalizeYear(value: string | number | null | undefined): number | null {
	const year = typeof value === 'number' ? value : Number(value);
	return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : null;
}
