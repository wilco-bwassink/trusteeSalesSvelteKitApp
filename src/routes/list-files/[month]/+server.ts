import { error, json } from '@sveltejs/kit';
import { FileStorageError, listPdfFileNames } from '$lib/server/file-storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const pdfs = await listPdfFileNames(params.month);
		return json(pdfs);
	} catch (storageError) {
		if (storageError instanceof FileStorageError) {
			throw error(storageError.status, storageError.message);
		}
		throw storageError;
	}
};
