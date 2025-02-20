import fs from 'fs';
import path from 'path';

export async function GET({ params }) {
	const { month } = params; // Get the month from the URL

	// Define the folder path (e.g., "static/april" for /api/files/april)
	const directoryPath = path.join('static', month);

	// Ensure the folder exists
	if (!fs.existsSync(directoryPath)) {
		return new Response(JSON.stringify({ error: 'Folder not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const files = fs
			.readdirSync(directoryPath)
			.map((file) => {
				const filePath = path.join(directoryPath, file);
				const stats = fs.statSync(filePath);
				return {
					name: file,
					time: stats.mtimeMs, // Last modified
					size: stats.size, // File size in bytes
					created: stats.ctimeMs // Creation time
				};
			})
			.sort((a, b) => a.time - b.time); // Sort oldest to newest

		return new Response(JSON.stringify(files), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error reading directory:', error);
		return new Response(JSON.stringify({ error: 'Failed to read directory' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
