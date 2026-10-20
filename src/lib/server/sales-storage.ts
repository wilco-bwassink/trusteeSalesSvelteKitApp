import { env } from '$env/dynamic/private';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getMonthLabel, getMonthRoute, MONTHS, normalizeMonthSlug } from '$lib/months';
import type { SaleRecord } from '../../types';
import { atomicWriteFile, hasErrorCode, withFileLock } from './safe-files';

export class SalesStorageError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'SalesStorageError';
	}
}

function requireDate(value: unknown, monthIndex: number): string {
	if (typeof value !== 'string') throw new SalesStorageError(400, 'A sale date is required.');
	const date = value.trim();
	const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date);
	const us = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(date);
	const [year, month, day] = iso
		? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
		: us
			? [Number(us[3]), Number(us[1]), Number(us[2])]
			: [0, 0, 0];
	const probe = new Date(Date.UTC(year, month - 1, day));
	if (
		year < 1900 ||
		year > 2200 ||
		probe.getUTCFullYear() !== year ||
		probe.getUTCMonth() !== month - 1 ||
		probe.getUTCDate() !== day ||
		month !== monthIndex + 1
	) {
		throw new SalesStorageError(
			400,
			`Enter a valid date for ${MONTHS[monthIndex].label} using M/D/YYYY or YYYY-MM-DD.`
		);
	}
	return `${month}/${day}/${year}`;
}

export function validateSales(value: unknown): SaleRecord[] {
	if (!Array.isArray(value) || value.length !== MONTHS.length) {
		throw new SalesStorageError(400, 'The schedule must contain all twelve months.');
	}
	const seen = new Set<string>();
	const sales = value.map((record): SaleRecord => {
		if (!record || typeof record !== 'object' || Array.isArray(record)) {
			throw new SalesStorageError(400, 'Invalid sale record.');
		}
		const rawMonth = record.monthSlug ?? record.month;
		const month = typeof rawMonth === 'string' ? normalizeMonthSlug(rawMonth) : null;
		if (!month || seen.has(month)) {
			throw new SalesStorageError(400, 'Each month must appear exactly once.');
		}
		seen.add(month);
		const date = requireDate(
			record.date,
			MONTHS.findIndex((entry) => entry.slug === month)
		);
		if (typeof record.showMap !== 'boolean') {
			throw new SalesStorageError(400, 'Map visibility must be true or false.');
		}
		if (record.mapUrl !== undefined && typeof record.mapUrl !== 'string') {
			throw new SalesStorageError(400, 'Invalid map URL.');
		}
		const mapUrl = (record.mapUrl ?? '').trim();
		if (mapUrl) {
			let url: URL;
			try {
				url = new URL(mapUrl);
			} catch {
				throw new SalesStorageError(
					400,
					`Enter a valid HTTPS map URL for ${getMonthLabel(month)}.`
				);
			}
			if (url.protocol !== 'https:' || url.username || url.password || mapUrl.length > 2048) {
				throw new SalesStorageError(400, 'Map URLs must use HTTPS without embedded credentials.');
			}
		} else if (record.showMap) {
			throw new SalesStorageError(
				400,
				`Add a map URL before showing the ${getMonthLabel(month)} map.`
			);
		}
		return {
			month: getMonthLabel(month),
			monthSlug: month,
			link: getMonthRoute(month),
			date,
			year: Number(date.split('/')[2]),
			showMap: record.showMap,
			mapUrl
		};
	});
	return MONTHS.map((month) => sales.find((sale) => sale.monthSlug === month.slug)!);
}

function dataPath() {
	return path.resolve(env.TRUSTEE_SALES_DATA_FILE?.trim() || 'storage/sales.json');
}

function revision(raw: string) {
	return `"${createHash('sha256').update(raw).digest('hex')}"`;
}

function parseStoredSales(raw: string) {
	try {
		return validateSales(JSON.parse(raw));
	} catch {
		throw new SalesStorageError(
			500,
			'The saved schedule could not be read. Contact the administrator.'
		);
	}
}

async function readRawSales(filename: string): Promise<string> {
	try {
		return await readFile(filename, 'utf8');
	} catch (error) {
		if (!hasErrorCode(error, 'ENOENT')) throw error;
		// Only the default location is initialized from the legacy file. An explicit
		// storage path must already exist, so a typo cannot publish a stale schedule.
		if (env.TRUSTEE_SALES_DATA_FILE?.trim()) {
			throw new SalesStorageError(
				500,
				'The configured schedule file is missing. Contact the administrator.'
			);
		}
		const seed = await readFile(path.resolve('sales.json'), 'utf8');
		parseStoredSales(seed);
		await mkdir(path.dirname(filename), { recursive: true });
		try {
			await atomicWriteFile(filename, seed, false);
		} catch (error) {
			if (!hasErrorCode(error, 'EEXIST')) throw error;
		}
		return readFile(filename, 'utf8');
	}
}

export async function readSales() {
	const raw = await readRawSales(dataPath());
	return { sales: parseStoredSales(raw), revision: revision(raw) };
}

export async function saveSales(value: unknown, expectedRevision: string | null) {
	if (!expectedRevision) {
		throw new SalesStorageError(
			428,
			'Reload the schedule before saving. A schedule version is required.'
		);
	}
	const sales = validateSales(value);
	const filename = dataPath();
	await readRawSales(filename);
	try {
		return await withFileLock(`${filename}.lock`, async () => {
			const previous = await readFile(filename, 'utf8');
			parseStoredSales(previous);
			if (revision(previous) !== expectedRevision) {
				throw new SalesStorageError(
					409,
					'The schedule has changed since you opened it. Copy your edits, reload, and apply them to the latest schedule.'
				);
			}
			const next = `${JSON.stringify(sales, null, 2)}\n`;
			await atomicWriteFile(`${filename}.bak`, previous);
			await atomicWriteFile(filename, next);
			return { sales, revision: revision(next) };
		});
	} catch (error) {
		if (hasErrorCode(error, 'EEXIST')) {
			throw new SalesStorageError(409, 'Another schedule save is in progress. Please try again.');
		}
		throw error;
	}
}
