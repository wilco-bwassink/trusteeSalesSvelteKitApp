import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	const { month, filename, filenames } = await request.json();

	if (!month || (!filename && !filenames)) {
		throw error(400, 'Month and at least one filename are required.');
	}

	const filesToDelete = filenames ?? [filename];
	const deleted: string[] = [];

	for (const file of filesToDelete) {
		const filePath = path.resolve('static', month, file);
		try {
			await fs.unlink(filePath);
			deleted.push(file);
		} catch (err) {
			console.error(`Error deleting ${file}:`, err);
		}
	}

	return json({ success: true, message: `Deleted ${deleted.length} file(s)` });
};
