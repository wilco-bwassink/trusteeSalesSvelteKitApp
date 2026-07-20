import { base } from '$app/paths';
import { dev } from '$app/environment';
import { json, redirect, type Handle } from '@sveltejs/kit';
import {
	AUTH_COOKIE_NAME,
	getStaticAuthConfig,
	verifySessionToken,
	type AuthenticatedUser
} from '$lib/server/auth';

const protectedRoutes = ['/admin', '/upload', '/delete-file', '/list-files'];
const protectedEndpointRoutes = ['/delete-file', '/list-files'];
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname.replace(new RegExp(`^${base}`), '') || '/';
	const staticAuthConfig = getStaticAuthConfig();
	const windowsUsername = event.request.headers.get('x-windows-user')?.trim() || null;
	const sessionToken = event.cookies.get(AUTH_COOKIE_NAME);
	let user: AuthenticatedUser | null = windowsUsername
		? { username: windowsUsername, authMethod: 'windows' }
		: null;

	if (!user && staticAuthConfig && sessionToken) {
		user = verifySessionToken(
			sessionToken,
			staticAuthConfig.sessionSecret,
			staticAuthConfig.username
		);
	}

	if (!user && dev && !staticAuthConfig && localHosts.has(event.url.hostname)) {
		user = { username: 'LOCALDEV\\developer', authMethod: 'development' };
	}

	event.locals.user = user;

	const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
	const isProtectedSalesWrite = path === '/api/sales' && event.request.method !== 'GET';

	if ((isProtectedRoute || isProtectedSalesWrite) && !event.locals.user) {
		const isEndpointRequest =
			protectedEndpointRoutes.some((route) => path.startsWith(route)) || isProtectedSalesWrite;

		if (isEndpointRequest) {
			return json({ message: 'Authentication required.' }, { status: 401 });
		}

		const returnTo = `${event.url.pathname}${event.url.search}`;
		throw redirect(303, `${base}/login?returnTo=${encodeURIComponent(returnTo)}`);
	}

	return resolve(event);
};
