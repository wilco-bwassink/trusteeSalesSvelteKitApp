import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { getMonthLabel, getMonthRoute, getSaleYear, normalizeMonthSlug } from '$lib/months';
import type { SaleRecord } from '../../../types';
import type { RequestHandler } from './$types';

const dataPath = path.resolve('sales.json'); // Make sure file is in root!

function normalizeSaleRecord(record: SaleRecord): SaleRecord {
	const monthSlug = normalizeMonthSlug(record.monthSlug ?? record.month);

	return {
		...record,
		month: monthSlug ? getMonthLabel(monthSlug) : record.month,
		monthSlug: monthSlug ?? undefined,
		link: monthSlug ? getMonthRoute(monthSlug) : record.link,
		year: getSaleYear(record.date)
	};
}

export const GET: RequestHandler = async () => {
	const raw = await fs.readFile(dataPath, 'utf-8');
	const sales = JSON.parse(raw).map(normalizeSaleRecord);
	return json(sales);
};

export const POST: RequestHandler = async ({ request }) => {
	const data = ((await request.json()) as SaleRecord[]).map(normalizeSaleRecord);
	await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
	return json({ success: true });
};
