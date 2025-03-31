import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

const dataPath = path.resolve('sales.json'); // Make sure file is in root!

export async function GET() {
	const raw = await fs.readFile(dataPath, 'utf-8');
	return json(JSON.parse(raw));
}

export async function POST({ request }) {
	const data = await request.json();
	await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
	return json({ success: true });
}
