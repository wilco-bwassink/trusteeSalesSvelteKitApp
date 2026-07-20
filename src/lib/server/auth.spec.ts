import { describe, expect, it } from 'vitest';
import {
	AUTH_SESSION_MAX_AGE_SECONDS,
	createSessionToken,
	generatePasswordHash,
	getStaticAuthConfig,
	isSafeReturnPath,
	verifyPassword,
	verifySessionToken
} from './auth';

const username = 'trustee-admin';
const secret = 'a-secure-session-secret-with-at-least-32-characters';
const now = new Date('2026-07-20T12:00:00.000Z');

describe('password authentication', () => {
	it('generates a salted hash and verifies the matching password', async () => {
		const hash = await generatePasswordHash('correct horse battery staple');

		expect(hash).toMatch(/^scrypt\$/);
		await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
		await expect(verifyPassword('incorrect password', hash)).resolves.toBe(false);
	});

	it('rejects malformed password hashes', async () => {
		await expect(verifyPassword('password', 'not-a-valid-hash')).resolves.toBe(false);
	});
});

describe('password sessions', () => {
	it('accepts an untampered, unexpired token for the configured user', () => {
		const token = createSessionToken(username, secret, now);

		expect(verifySessionToken(token, secret, username, now)).toEqual({
			username,
			authMethod: 'password'
		});
	});

	it('rejects tampered tokens and tokens for a different configured user', () => {
		const token = createSessionToken(username, secret, now);
		const tamperedToken = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

		expect(verifySessionToken(tamperedToken, secret, username, now)).toBeNull();
		expect(verifySessionToken(token, secret, 'someone-else', now)).toBeNull();
	});

	it('rejects expired tokens', () => {
		const token = createSessionToken(username, secret, now);
		const expiredAt = new Date(now.getTime() + (AUTH_SESSION_MAX_AGE_SECONDS + 1) * 1000);

		expect(verifySessionToken(token, secret, username, expiredAt)).toBeNull();
	});
});

describe('authentication configuration', () => {
	it('is disabled when no password settings are present', () => {
		expect(getStaticAuthConfig({})).toBeNull();
	});

	it('rejects partial configuration', () => {
		expect(() => getStaticAuthConfig({ TRUSTEE_ADMIN_USERNAME: username })).toThrow(
			'only partially configured'
		);
	});
});

describe('login return paths', () => {
	it('allows local trustee paths', () => {
		expect(isSafeReturnPath('/trustee/admin?tab=files')).toBe(true);
	});

	it('rejects external and lookalike paths', () => {
		expect(isSafeReturnPath('https://example.com/trustee/admin')).toBe(false);
		expect(isSafeReturnPath('//example.com/trustee/admin')).toBe(false);
		expect(isSafeReturnPath('/trustee-evil/admin')).toBe(false);
	});
});
