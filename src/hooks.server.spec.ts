import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handle } from './hooks.server';

vi.mock('$app/paths', () => ({ base: '/trustee' }));
vi.mock('$app/environment', () => ({ dev: false }));

function requestEvent(path: string, method = 'GET', origin?: string) {
	const url = new URL(path, 'http://dev.wilco.org');
	return {
		url,
		request: new Request(url, { method, headers: origin ? { origin } : {} }),
		locals: {}
	} as RequestEvent;
}

describe('IIS Windows authentication', () => {
	const resolve = vi.fn(async () => new Response('OK'));

	beforeEach(() => resolve.mockClear());

	it.each(['/admin', '/upload', '/admin/api/sales', '/delete-file', '/list-files'])(
		'accepts an IIS-authenticated request to %s without a forwarded identity or session cookie',
		async (path) => {
			const event = requestEvent(`/trustee${path}`);
			const response = await handle({ event, resolve });

			expect(response.status).toBe(200);
			expect(event.locals.user).toEqual({
				username: 'Windows authenticated user',
				authMethod: 'windows'
			});
			expect(resolve).toHaveBeenCalledOnce();
		}
	);

	it.each(['/', '/api/sales', '/admin-lookalike'])(
		'keeps public route %s anonymous',
		async (path) => {
			const event = requestEvent(`/trustee${path}`);
			await handle({ event, resolve });

			expect(event.locals.user).toBeNull();
		}
	);

	it.each([
		['/upload', 'POST'],
		['/admin/api/sales', 'POST'],
		['/api/sales', 'PUT'],
		['/api/sales', 'PATCH'],
		['/delete-file', 'DELETE']
	])('rejects cross-site %s %s before the route runs', async (path, method) => {
		const event = requestEvent(`/trustee${path}`, method, 'https://other.example');

		await expect(handle({ event, resolve })).rejects.toMatchObject({ status: 403 });
		expect(resolve).not.toHaveBeenCalled();
	});

	it('rejects protected writes without an Origin header', async () => {
		const event = requestEvent('/trustee/upload', 'POST');

		await expect(handle({ event, resolve })).rejects.toMatchObject({ status: 403 });
		expect(resolve).not.toHaveBeenCalled();
	});

	it.each(['/upload', '/admin/api/sales', '/api/sales'])(
		'allows same-origin writes to %s',
		async (path) => {
			const event = requestEvent(`/trustee${path}`, 'POST', 'http://dev.wilco.org');
			const response = await handle({ event, resolve });

			expect(response.status).toBe(200);
			expect(event.locals.user?.authMethod).toBe('windows');
		}
	);
});
