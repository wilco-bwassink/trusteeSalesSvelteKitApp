import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { normalizeMonthSlug } from '$lib/months';

console.log('Delete Endpoint Hit');
export const POST: RequestHandler = async ({ request }) => {
	const { month: rawMonth, filename, filenames } = await request.json();
	const month = normalizeMonthSlug(rawMonth);

	if (!month || (!filename && !filenames)) {
		throw error(400, 'Month and at least one filename are required.');
	}

	const filesToDelete = Array.isArray(filenames) ? filenames : [filename];
	const deleted: string[] = [];
	const directoryPath = path.resolve('static', month);

	for (const file of filesToDelete) {
		if (typeof file !== 'string' || path.basename(file) !== file) {
			throw error(400, 'Invalid filename.');
		}

		const filePath = path.resolve(directoryPath, file);
		if (!filePath.startsWith(directoryPath + path.sep)) {
			throw error(400, 'Invalid file path.');
		}

		console.log('Resolved path to delete:', filePath);

		try {
			await fs.unlink(filePath);
			deleted.push(file);
		} catch (err) {
			console.error(`Error deleting ${file}:`, err);
		}
	}

	console.log('Incoming delete request:', { month, filename });

	return json({ success: true, message: `Deleted ${deleted.length} file(s)` });
};
