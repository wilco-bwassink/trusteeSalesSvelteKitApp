import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FileStorageError, getPdfFile } from '$lib/server/file-storage';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const file = await getPdfFile(params.month, params.filename);

		return new Response(file.contents, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Length': String(file.size),
				'Content-Disposition': `inline; filename="${file.name}"`,
				'Cache-Control': 'no-cache',
				'Last-Modified': new Date(file.modified).toUTCString(),
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (storageError) {
		if (storageError instanceof FileStorageError) {
			throw error(storageError.status, storageError.message);
		}
		throw storageError;
	}
};
