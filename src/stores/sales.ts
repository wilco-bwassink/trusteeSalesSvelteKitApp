import { writable } from 'svelte/store';

export type SaleRecord = {
	month: string;
	link: string;
	date: string;
	showMap: boolean;
	mapUrl?: string;
};

export const salesData = writable<SaleRecord[]>([]);

if (typeof window !== 'undefined') {
	fetch('/api/sales')
		.then((res) => res.json())
		.then((data) => {
			salesData.set(data);
		});
}
