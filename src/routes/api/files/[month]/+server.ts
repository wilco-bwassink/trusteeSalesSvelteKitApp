import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';
import { normalizeMonthSlug } from '$lib/months';

interface FileEntry {
	name: string;
	size: number;
	created: number;
	time: number;
}

export const GET: RequestHandler = async ({ params }) => {
	const month = normalizeMonthSlug(params.month);
	if (!month) {
		return new Response(JSON.stringify({ error: 'Invalid month' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const directoryPath = path.resolve('static', month);

	try {
		// Ensure the directory exists before reading it
		if (!fs.existsSync(directoryPath)) {
			return new Response(JSON.stringify({ error: 'Directory not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const files: FileEntry[] = fs
			.readdirSync(directoryPath)
			.filter((file: string) => file.toLowerCase().endsWith('.pdf'))
			.map((file: string) => {
				const filePath = path.join(directoryPath, file);
				const stats = fs.statSync(filePath);
				return {
					name: file,
					size: stats.size, // Get file size in bytes
					created: stats.birthtimeMs, // Get file creation time
					time: stats.mtimeMs // Keep modification time for sorting
				};
			})
			.sort((a, b) => a.time - b.time); // Sort by modification time (oldest to newest)

		return new Response(JSON.stringify(files), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to read directory' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
