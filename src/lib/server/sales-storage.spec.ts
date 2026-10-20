import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MONTHS } from '$lib/months';
import { readSales, saveSales, validateSales } from './sales-storage';

const { environment } = vi.hoisted(() => ({
	environment: {} as Record<string, string>
}));
vi.mock('$env/dynamic/private', () => ({ env: environment }));

function schedule() {
	return MONTHS.map((month, index) => ({
		month: month.label,
		monthSlug: month.slug,
		date: `${index + 1}/1/2026`,
		showMap: false,
		mapUrl: ''
	}));
}

describe('persistent schedules', () => {
	let directory: string;
	let filename: string;
	let original: string;

	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'trustee-sales-test-'));
		filename = path.join(directory, 'sales.json');
		environment.TRUSTEE_SALES_DATA_FILE = filename;
		original = JSON.stringify(schedule());
		await writeFile(filename, original);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		delete environment.TRUSTEE_SALES_DATA_FILE;
		await rm(directory, { recursive: true, force: true });
	});

	it('saves a validated schedule and preserves the previous complete file', async () => {
		const initial = await readSales();
		const edited = schedule();
		edited[0].date = '2026-01-06';
		const saved = await saveSales(edited, initial.revision);
		expect(saved.sales[0].date).toBe('1/6/2026');
		expect(saved.revision).not.toBe(initial.revision);
		expect(await readFile(`${filename}.bak`, 'utf8')).toBe(original);
		expect((await readSales()).sales).toEqual(saved.sales);
		expect((await readdir(directory)).sort()).toEqual(['sales.json', 'sales.json.bak']);
	});

	it('rejects an old editor without overwriting the newer schedule', async () => {
		const { revision } = await readSales();
		const edited = schedule();
		edited[0].date = '1/6/2026';
		await saveSales(edited, revision);
		await expect(saveSales(schedule(), revision)).rejects.toMatchObject({ status: 409 });
		expect((await readSales()).sales[0].date).toBe('1/6/2026');
	});

	it('allows only one of two concurrent saves from the same revision', async () => {
		const { revision } = await readSales();
		const edited = schedule();
		edited[0].date = '1/6/2026';
		const outcomes = await Promise.allSettled([
			saveSales(edited, revision),
			saveSales(edited, revision)
		]);
		expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1);
		expect((await readSales()).sales[0].date).toBe('1/6/2026');
	});

	it('requires a revision and rejects an empty schedule without changing disk', async () => {
		await expect(saveSales(schedule(), null)).rejects.toMatchObject({ status: 428 });
		await expect(saveSales([], (await readSales()).revision)).rejects.toMatchObject({
			status: 400
		});
		expect(await readFile(filename, 'utf8')).toBe(original);
	});

	it('does not replace missing explicitly configured storage with seed data', async () => {
		environment.TRUSTEE_SALES_DATA_FILE = path.join(directory, 'missing.json');
		await expect(readSales()).rejects.toMatchObject({ status: 500 });
	});

	it('initializes default storage once and ignores later changes to the legacy seed', async () => {
		delete environment.TRUSTEE_SALES_DATA_FILE;
		vi.spyOn(process, 'cwd').mockReturnValue(directory);
		const initial = await readSales();
		expect(await readFile(path.join(directory, 'storage', 'sales.json'), 'utf8')).toBe(original);
		const edited = schedule();
		edited[0].date = '1/6/2026';
		await saveSales(edited, initial.revision);
		await writeFile(filename, JSON.stringify(schedule()));
		expect((await readSales()).sales[0].date).toBe('1/6/2026');
	});

	it('reports corrupt persisted data as a server error', async () => {
		await writeFile(filename, '{broken');
		await expect(readSales()).rejects.toMatchObject({ status: 500 });
		expect(await readFile(filename, 'utf8')).toBe('{broken');
	});

	it('preserves the schedule if the backup cannot be written', async () => {
		const { mkdir } = await import('node:fs/promises');
		await mkdir(`${filename}.bak`);
		await expect(saveSales(schedule(), (await readSales()).revision)).rejects.toThrow();
		expect(await readFile(filename, 'utf8')).toBe(original);
		expect(await readdir(directory)).not.toContain('sales.json.lock');
	});

	it.each(['2/30/2026', '1/1/2026', 'not a date'])('rejects invalid February date %s', (date) => {
		const edited = schedule();
		edited[1].date = date;
		expect(() => validateSales(edited)).toThrow('valid date for February');
	});

	it('rejects duplicate months, unsafe map URLs, and visible maps without a URL', () => {
		const duplicate = schedule();
		duplicate[1] = duplicate[0];
		expect(() => validateSales(duplicate)).toThrow('exactly once');
		const edited = schedule();
		edited[0].mapUrl = 'javascript:alert(1)';
		expect(() => validateSales(edited)).toThrow('HTTPS');
		edited[0].mapUrl = '';
		edited[0].showMap = true;
		expect(() => validateSales(edited)).toThrow('Add a map URL');
	});
});
