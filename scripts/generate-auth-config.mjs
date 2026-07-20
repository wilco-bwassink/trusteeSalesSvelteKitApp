import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const MINIMUM_PASSWORD_LENGTH = 12;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;

if (!process.stdin.isTTY) {
	console.error('This command must be run in an interactive terminal.');
	process.exit(1);
}

try {
	const password = await readHidden('Password: ');
	const confirmation = await readHidden('Confirm password: ');

	if (password !== confirmation) throw new Error('The passwords did not match.');
	if (password.length < MINIMUM_PASSWORD_LENGTH) {
		throw new Error(`The password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
	}

	const salt = randomBytes(16);
	const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
		cost: SCRYPT_COST,
		blockSize: SCRYPT_BLOCK_SIZE,
		parallelization: SCRYPT_PARALLELIZATION,
		maxmem: 64 * 1024 * 1024
	});
	const passwordHash = [
		'scrypt',
		SCRYPT_COST,
		SCRYPT_BLOCK_SIZE,
		SCRYPT_PARALLELIZATION,
		salt.toString('base64url'),
		derivedKey.toString('base64url')
	].join('$');

	console.log('\nSet these values in the environment used by PM2:');
	console.log('TRUSTEE_ADMIN_USERNAME=<choose-a-username>');
	console.log(`TRUSTEE_ADMIN_PASSWORD_HASH=${passwordHash}`);
	console.log(`TRUSTEE_AUTH_SESSION_SECRET=${randomBytes(32).toString('base64url')}`);
} catch (error) {
	console.error(
		`\n${error instanceof Error ? error.message : 'Could not generate authentication configuration.'}`
	);
	process.exitCode = 1;
}

function readHidden(prompt) {
	return new Promise((resolve, reject) => {
		let value = '';
		process.stdout.write(prompt);
		process.stdin.setRawMode(true);
		process.stdin.setEncoding('utf8');
		process.stdin.resume();

		const finish = () => {
			process.stdin.off('data', onData);
			process.stdin.setRawMode(false);
			process.stdin.pause();
			process.stdout.write('\n');
		};

		const onData = (chunk) => {
			for (const character of chunk) {
				if (character === '\u0003') {
					finish();
					reject(new Error('Cancelled.'));
					return;
				}

				if (character === '\r' || character === '\n') {
					finish();
					resolve(value);
					return;
				}

				if (character === '\b' || character === '\u007f') {
					if (value.length > 0) {
						value = value.slice(0, -1);
						process.stdout.write('\b \b');
					}
					continue;
				}

				if (character >= ' ') {
					value += character;
					process.stdout.write('*');
				}
			}
		};

		process.stdin.on('data', onData);
	});
}
