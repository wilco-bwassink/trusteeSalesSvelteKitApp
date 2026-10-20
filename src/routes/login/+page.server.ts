import { base } from '$app/paths';
import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	AUTH_COOKIE_NAME,
	AUTH_SESSION_MAX_AGE_SECONDS,
	createSessionToken,
	getStaticAuthConfig,
	isSafeReturnPath,
	verifyPassword
} from '$lib/server/auth';

export const load: PageServerLoad = ({ locals, url }) => {
	const returnTo = isSafeReturnPath(url.searchParams.get('returnTo'))
		? url.searchParams.get('returnTo')!
		: `${base}/admin`;

	if (locals.user) throw redirect(303, returnTo);

	return {
		returnTo,
		passwordLoginAvailable: getStaticAuthConfig() !== null
	};
};

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		const config = getStaticAuthConfig();
		if (!config) {
			return fail(503, { message: 'Password login is not configured on this server.' });
		}

		const form = await request.formData();
		const username = form.get('username')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';
		const requestedReturnTo = form.get('returnTo')?.toString() ?? null;
		const returnTo = isSafeReturnPath(requestedReturnTo) ? requestedReturnTo : `${base}/admin`;
		const passwordMatches = await verifyPassword(password, config.passwordHash);

		if (username !== config.username || !passwordMatches) {
			return fail(400, {
				message: 'The username or password is incorrect.',
				username,
				returnTo
			});
		}

		cookies.set(AUTH_COOKIE_NAME, createSessionToken(config.username, config.sessionSecret), {
			path: base || '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: AUTH_SESSION_MAX_AGE_SECONDS
		});

		throw redirect(303, returnTo);
	}
};
