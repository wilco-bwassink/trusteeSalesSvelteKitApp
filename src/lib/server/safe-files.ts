import { randomUUID } from 'node:crypto';
import { link, open, rename, unlink } from 'node:fs/promises';

export function hasErrorCode(error: unknown, code: string): boolean {
	return error instanceof Error && 'code' in error && error.code === code;
}

// Keep the temporary file on the same volume as the destination. Readers see
// either the previous complete file or the new complete file.
export async function atomicWriteFile(
	destination: string,
	contents: string | Buffer,
	replace = true
) {
	const temporary = `${destination}.${randomUUID()}.tmp`;
	const file = await open(temporary, 'wx');
	try {
		try {
			await file.writeFile(contents);
			await file.sync();
		} finally {
			await file.close();
		}
		if (replace) {
			await rename(temporary, destination);
		} else {
			// Unlike rename, link fails if another request already created the target.
			await link(temporary, destination);
		}
	} finally {
		await unlink(temporary).catch((error) => {
			if (!hasErrorCode(error, 'ENOENT')) throw error;
		});
	}
}

// A filesystem lock also covers separate Node processes using the same storage.
// Never expire a lock automatically: the owner might still be writing.
export async function withFileLock<T>(filename: string, operation: () => Promise<T>): Promise<T> {
	const lock = await open(filename, 'wx');
	try {
		return await operation();
	} finally {
		await lock.close();
		await unlink(filename);
	}
}
