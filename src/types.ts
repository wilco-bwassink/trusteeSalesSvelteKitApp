import type { MonthSlug } from '$lib/months';

export interface SaleRecord {
	month: string;
	monthSlug?: MonthSlug;
	link?: string;
	date: string;
	showMap: boolean;
	mapUrl?: string;
	year?: number | null;
}
