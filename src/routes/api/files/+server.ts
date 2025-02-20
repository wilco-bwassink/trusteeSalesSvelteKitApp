import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

interface FileEntry {
	name: string;
	time: number;
}

export const GET: RequestHandler = async () => {
	const directoryPath = 'static/april'; // Change this to your target folder

	try {
		const files: FileEntry[] = fs
			.readdirSync(directoryPath)
			.map((file: string) => {
				const filePath = path.join(directoryPath, file);
				const stats = fs.statSync(filePath);
				return {
					name: file,
					time: stats.mtimeMs // Use mtimeMs for sorting
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
