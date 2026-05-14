import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { deletePdfFiles, FileStorageError } from '$lib/server/file-storage';

export const POST: RequestHandler = async ({ request }) => {
	const { month: rawMonth, filename, filenames } = await request.json();

	if (!rawMonth || (!filename && !filenames)) {
		throw error(400, 'Month and at least one filename are required.');
	}

	const filesToDelete = Array.isArray(filenames) ? filenames : [filename];

	try {
		const deleted = await deletePdfFiles(rawMonth, filesToDelete);
		return json({ success: true, message: `Deleted ${deleted.length} file(s)` });
	} catch (storageError) {
		if (storageError instanceof FileStorageError) {
			throw error(storageError.status, storageError.message);
		}
		throw storageError;
	}
};
