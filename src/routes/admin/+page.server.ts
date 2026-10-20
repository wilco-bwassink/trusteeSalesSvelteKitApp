import type { PageServerLoad } from './$types';
import { readSales } from '$lib/server/sales-storage';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'no-store' });
	try {
		return { user: locals.user, ...(await readSales()), loadError: '' };
	} catch (error) {
		console.error('Unable to load the admin schedule:', error);
		return {
			user: locals.user,
			sales: [],
			revision: '',
			loadError: 'Unable to load the schedule. Reload the page to try again.'
		};
	}
};
