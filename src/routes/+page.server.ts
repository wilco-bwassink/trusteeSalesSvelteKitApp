import type { PageServerLoad } from './$types';
import { base } from '$app/paths';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(`${base}/api/sales`);
	if (!res.ok) throw error(503, 'The schedule is temporarily unavailable. Please try again later.');
	const sales = await res.json();
	return { sales };
};
