import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	const { month, filename } = data;

	if (!month || !filename) {
		throw error(400, 'Month and filename are required.');
	}

	const filePath = path.resolve('static', month, filename);

	try {
		await fs.unlink(filePath);
		return json({ success: true, message: `Deleted ${filename}` });
	} catch (err) {
		console.error('Delete error:', err);
		throw error(500, 'Failed to delete file.');
	}
};
