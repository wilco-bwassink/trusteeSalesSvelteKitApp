import { base } from '$app/paths';
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME } from '$lib/server/auth';

export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(AUTH_COOKIE_NAME, { path: base || '/' });
	throw redirect(303, base || '/');
};
