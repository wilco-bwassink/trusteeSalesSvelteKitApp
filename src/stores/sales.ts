import { writable } from 'svelte/store';
import type { SaleRecord } from '../types';

export const salesData = writable<SaleRecord[]>([
	{ month: 'January', link: '/january', date: '1/7/2025', showMap: true },
	{ month: 'February', link: '/february', date: '2/4/2025', showMap: true },
	{ month: 'March', link: '/march', date: '3/4/2025', showMap: true },
	{ month: 'April', link: '/april', date: '4/1/2025', showMap: true },
	{ month: 'May', link: '/may', date: '5/7/2024', showMap: true },
	{ month: 'June', link: '/june', date: '6/4/2024', showMap: true },
	{ month: 'July', link: '/july', date: '7/2/2024', showMap: true },
	{ month: 'August', link: '/august', date: '8/6/2024', showMap: true },
	{ month: 'September', link: '/september', date: '9/2/2024', showMap: true },
	{ month: 'October', link: '/october', date: '10/7/2024', showMap: true },
	{ month: 'November', link: '/november', date: '11/4/2024', showMap: true },
	{ month: 'December', link: '/december', date: '12/3/2024', showMap: true }
]);
