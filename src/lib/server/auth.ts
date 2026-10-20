import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';

export const AUTH_COOKIE_NAME = 'trustee_session';
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const PASSWORD_HASH_VERSION = 'scrypt';
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const SESSION_VERSION = 1;

export type AuthMethod = 'windows' | 'password' | 'development';

export interface AuthenticatedUser {
	username: string;
	authMethod: AuthMethod;
}

export interface StaticAuthConfig {
	username: string;
	passwordHash: string;
	sessionSecret: string;
}

interface SessionPayload {
	v: number;
	sub: string;
	exp: number;
}

export function getStaticAuthConfig(
	environment: NodeJS.ProcessEnv = process.env
): StaticAuthConfig | null {
	const username = environment.TRUSTEE_ADMIN_USERNAME;
	const passwordHash = environment.TRUSTEE_ADMIN_PASSWORD_HASH;
	const sessionSecret = environment.TRUSTEE_AUTH_SESSION_SECRET;
	const configuredValues = [username, passwordHash, sessionSecret].filter(Boolean).length;

	if (configuredValues === 0) return null;

	if (configuredValues !== 3) {
		throw new Error(
			'Password authentication is only partially configured. Set TRUSTEE_ADMIN_USERNAME, TRUSTEE_ADMIN_PASSWORD_HASH, and TRUSTEE_AUTH_SESSION_SECRET.'
		);
	}

	if (sessionSecret!.length < 32) {
		throw new Error('TRUSTEE_AUTH_SESSION_SECRET must contain at least 32 characters.');
	}

	return {
		username: username!,
		passwordHash: passwordHash!,
		sessionSecret: sessionSecret!
	};
}

export async function generatePasswordHash(password: string): Promise<string> {
	if (!password) throw new Error('Password cannot be empty.');

	const salt = randomBytes(16);
	const derivedKey = await derivePasswordKey(password, salt, {
		cost: SCRYPT_COST,
		blockSize: SCRYPT_BLOCK_SIZE,
		parallelization: SCRYPT_PARALLELIZATION
	});

	return [
		PASSWORD_HASH_VERSION,
		SCRYPT_COST,
		SCRYPT_BLOCK_SIZE,
		SCRYPT_PARALLELIZATION,
		salt.toString('base64url'),
		derivedKey.toString('base64url')
	].join('$');
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
	const parsedHash = parsePasswordHash(encodedHash);
	if (!parsedHash) return false;

	try {
		const actualKey = await derivePasswordKey(password, parsedHash.salt, parsedHash);
		return (
			actualKey.length === parsedHash.derivedKey.length &&
			timingSafeEqual(actualKey, parsedHash.derivedKey)
		);
	} catch {
		return false;
	}
}

export function createSessionToken(
	username: string,
	sessionSecret: string,
	now = new Date()
): string {
	const payload: SessionPayload = {
		v: SESSION_VERSION,
		sub: username,
		exp: Math.floor(now.getTime() / 1000) + AUTH_SESSION_MAX_AGE_SECONDS
	};
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${encodedPayload}.${signPayload(encodedPayload, sessionSecret)}`;
}

export function verifySessionToken(
	token: string,
	sessionSecret: string,
	expectedUsername: string,
	now = new Date()
): AuthenticatedUser | null {
	const parts = token.split('.');
	if (parts.length !== 2) return null;

	const [encodedPayload, suppliedSignature] = parts;
	const expectedSignature = signPayload(encodedPayload, sessionSecret);
	const suppliedBuffer = Buffer.from(suppliedSignature, 'base64url');
	const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

	if (
		suppliedBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(suppliedBuffer, expectedBuffer)
	) {
		return null;
	}

	try {
		const payload = JSON.parse(
			Buffer.from(encodedPayload, 'base64url').toString('utf8')
		) as SessionPayload;
		const nowInSeconds = Math.floor(now.getTime() / 1000);

		if (
			payload.v !== SESSION_VERSION ||
			payload.sub !== expectedUsername ||
			!Number.isSafeInteger(payload.exp) ||
			payload.exp <= nowInSeconds
		) {
			return null;
		}

		return { username: payload.sub, authMethod: 'password' };
	} catch {
		return null;
	}
}

export function isSafeReturnPath(path: string | null): path is string {
	if (!path || !path.startsWith('/trustee')) return false;

	try {
		const url = new URL(path, 'https://trustee.invalid');
		return (
			url.origin === 'https://trustee.invalid' &&
			(url.pathname === '/trustee' || url.pathname.startsWith('/trustee/'))
		);
	} catch {
		return false;
	}
}

function parsePasswordHash(encodedHash: string) {
	const [version, rawCost, rawBlockSize, rawParallelization, rawSalt, rawDerivedKey, ...extra] =
		encodedHash.split('$');
	const cost = Number(rawCost);
	const blockSize = Number(rawBlockSize);
	const parallelization = Number(rawParallelization);

	if (
		version !== PASSWORD_HASH_VERSION ||
		extra.length > 0 ||
		!Number.isSafeInteger(cost) ||
		!Number.isSafeInteger(blockSize) ||
		!Number.isSafeInteger(parallelization) ||
		cost < 2 ||
		blockSize < 1 ||
		parallelization < 1 ||
		!rawSalt ||
		!rawDerivedKey
	) {
		return null;
	}

	const salt = Buffer.from(rawSalt, 'base64url');
	const derivedKey = Buffer.from(rawDerivedKey, 'base64url');
	if (salt.length < 16 || derivedKey.length !== SCRYPT_KEY_LENGTH) return null;

	return { cost, blockSize, parallelization, salt, derivedKey };
}

async function derivePasswordKey(
	password: string,
	salt: Buffer,
	options: { cost: number; blockSize: number; parallelization: number }
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		nodeScrypt(
			password,
			salt,
			SCRYPT_KEY_LENGTH,
			{
				cost: options.cost,
				blockSize: options.blockSize,
				parallelization: options.parallelization,
				maxmem: SCRYPT_MAX_MEMORY
			},
			(error, derivedKey) => {
				if (error) reject(error);
				else resolve(derivedKey);
			}
		);
	});
}

function signPayload(encodedPayload: string, sessionSecret: string): string {
	return createHmac('sha256', sessionSecret).update(encodedPayload).digest('base64url');
}
