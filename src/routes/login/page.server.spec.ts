import { describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

vi.mock('$app/paths', () => ({ base: '/trustee' }));

describe('legacy login route', () => {
	it.each([
		[null, '/trustee/admin'],
		['/trustee/upload?month=october', '/trustee/upload?month=october'],
		['/trustee/admin', '/trustee/admin'],
		['https://other.example/trustee/upload', '/trustee/admin'],
		['//other.example/trustee/admin', '/trustee/admin'],
		['http://[invalid', '/trustee/admin'],
		['/trustee/login', '/trustee/admin'],
		['/trustee/admin-lookalike', '/trustee/admin']
	])('redirects %s to the protected staff route %s', async (returnTo, location) => {
		const url = new URL('http://dev.wilco.org/trustee/login');
		if (returnTo) url.searchParams.set('returnTo', returnTo);

		await expect(async () => load({ url } as Parameters<typeof load>[0])).rejects.toMatchObject({
			status: 303,
			location
		});
	});
});
