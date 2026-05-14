import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { FileStorageError, listPdfFiles } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const files = await listPdfFiles(params.month);
		return json(files);
	} catch (storageError) {
		if (storageError instanceof FileStorageError) {
			throw error(storageError.status, storageError.message);
		}
		throw storageError;
	}
};
