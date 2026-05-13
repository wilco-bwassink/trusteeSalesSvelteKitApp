import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { normalizeMonthSlug } from '$lib/months';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const month = normalizeMonthSlug(params.month);
	if (!month) {
		return json([], { status: 400 });
	}

	const dirPath = path.resolve('static', month);

	try {
		const entries = await fs.readdir(dirPath);
		const pdfs = entries.filter((file) => file.toLowerCase().endsWith('.pdf'));
		return json(pdfs);
	} catch (err) {
		return json([], { status: 404 });
	}
};
