import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const requestedReturnTo = url.searchParams.get('returnTo');
	const staffRoutes = [`${base}/admin`, `${base}/upload`];
	let returnTo = `${base}/admin`;

	if (requestedReturnTo) {
		try {
			const destination = new URL(requestedReturnTo, url.origin);
			if (destination.origin === url.origin && staffRoutes.includes(destination.pathname)) {
				returnTo = `${destination.pathname}${destination.search}`;
			}
		} catch {
			// Invalid destinations fall back to the protected admin page.
		}
	}

	// Visiting the protected route lets IIS issue the Windows authentication challenge.
	throw redirect(303, returnTo);
};
