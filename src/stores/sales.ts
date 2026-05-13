import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { base } from '$app/paths';
import type { SaleRecord } from '../types';

export const salesData = writable<SaleRecord[]>([]);

if (browser) {
	const url = `${base}/api/sales`;

	fetch(url)
		.then((res) => {
			if (!res.ok) throw new Error(`Failed to fetch sales: ${res.statusText}`);
			return res.json();
		})
		.then((data: SaleRecord[]) => {
			salesData.set(data);
		})
		.catch((err) => {
			console.error('Error loading sales data:', err);
			// Optionally set fallback data or show error UI
		});
}
