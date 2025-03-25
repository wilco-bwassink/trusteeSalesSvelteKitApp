import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

export async function GET({ params }) {
	const { month } = params;

	const allowedMonths = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	if (!allowedMonths.includes(month)) {
		return json([], { status: 400 });
	}

	const dirPath = path.resolve('static', month);

	try {
		const entries = await fs.readdir(dirPath);
		const pdfs = entries.filter((file) => file.endsWith('.pdf'));
		return json(pdfs);
	} catch (err) {
		return json([], { status: 404 });
	}
}
