import type { PageServerLoad } from './$types';
import { base } from '$app/paths';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const res = await fetch(`${base}/api/sales`);
	const sales = await res.json();

	return { sales, user: locals.user };
};
