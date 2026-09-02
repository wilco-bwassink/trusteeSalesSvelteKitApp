import { error, type Handle } from '@sveltejs/kit';
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
	const path = event.url.pathname.replace(/^\/trustee/, '');
	const protectedRequest = isProtectedRequest(path, event.request.method);
	const devUser = dev && localHosts.has(event.url.hostname) ? 'LOCALDEV\\developer' : null;

	// IIS Windows Authentication and the authorization rules in web.config are the
	// access-control boundary. The Node server listens only on loopback, so public
	// requests must pass IIS before they can reach these protected routes.
	event.locals.user = protectedRequest
		? { username: devUser ?? 'Windows authenticated user' }
		: devUser
			? { username: devUser }
			: null;

	// Windows authentication is sent automatically by browsers in many intranet configurations.
	// Reject cross-site state-changing requests before route actions run.
	if (protectedRequest && unsafeMethods.has(event.request.method)) {
		const origin = event.request.headers.get('origin');
		if (origin !== event.url.origin) {
			throw error(403, 'Cross-site request rejected.');
		}
	}

	return resolve(event);
};
