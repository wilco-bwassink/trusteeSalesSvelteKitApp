import { json } from '@sveltejs/kit';
import { readSales, saveSales, SalesStorageError } from '$lib/server/sales-storage';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const snapshot = await readSales();
	return json(snapshot.sales, {
		headers: { ETag: snapshot.revision, 'Cache-Control': 'no-store' }
	});
};

export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ message: 'Invalid JSON request.' }, { status: 400 });
	}
	try {
		const snapshot = await saveSales(data, request.headers.get('if-match'));
		return json({ success: true, ...snapshot }, { headers: { 'Cache-Control': 'no-store' } });
	} catch (error) {
		if (error instanceof SalesStorageError) {
			return json({ message: error.message }, { status: error.status });
		}
		console.error('Unable to save sales schedule:', error);
		return json(
			{ message: 'The schedule could not be saved. Your edits have been kept on screen.' },
			{ status: 500 }
		);
	}
};
