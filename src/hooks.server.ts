import { error, type Handle } from '@sveltejs/kit';
import { base } from '$app/paths';
import { dev } from '$app/environment';

const protectedRoutePrefixes = ['/admin', '/upload', '/delete-file', '/list-files'];
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isRouteOrChild(path: string, route: string) {
	return path === route || path.startsWith(`${route}/`);
}

function isProtectedRequest(path: string, method: string) {
	return (
		protectedRoutePrefixes.some((route) => isRouteOrChild(path, route)) ||
		(path === '/api/sales' && method !== 'GET')
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname.slice(base.length) || '/';
	const protectedRequest = isProtectedRequest(path, event.request.method);
	const isLocalDev = dev && localHosts.has(event.url.hostname);

	// IIS enforces Windows Authentication on protected routes before proxying to
	// this loopback-only Node server. It does not forward an X-Windows-User header.
	event.locals.user = isLocalDev
		? { username: 'LOCALDEV\\developer', authMethod: 'development' }
		: protectedRequest
			? { username: 'Windows authenticated user', authMethod: 'windows' }
			: null;

	// Browsers can send Windows credentials automatically, so protected writes
	// must also originate from this site.
	if (protectedRequest && unsafeMethods.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		if (origin !== event.url.origin) {
			throw error(403, 'Cross-site request rejected.');
		}
	}

	return resolve(event);
};
