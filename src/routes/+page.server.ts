import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/sales');
	const sales = await res.json();
	return { sales };
};
