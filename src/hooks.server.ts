import { redirect, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const protectedRoutes = ['/admin', '/upload', '/delete-file', '/list-files'];
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname.replace(/^\/trustee/, '');
	const windowsUser = event.request.headers.get('x-windows-user');
	const devUser = dev && localHosts.has(event.url.hostname) ? 'LOCALDEV\\developer' : null;
	const user = windowsUser ?? devUser;

	event.locals.user = user ? { username: user } : null;

	const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
	const isProtectedSalesWrite = path === '/api/sales' && event.request.method !== 'GET';

	if ((isProtectedRoute || isProtectedSalesWrite) && !event.locals.user) {
		throw redirect(302, '/trustee');
	}

	return resolve(event);
};
