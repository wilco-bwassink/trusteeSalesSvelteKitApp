import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { normalizeMonthSlug, type MonthSlug } from '$lib/months';

export type PdfFileEntry = {
	name: string;
	size: number;
	created: number;
	time: number;
};

export type SavedPdfResult = {
	month: MonthSlug;
	saved: string[];
};

export type PdfFile = {
	name: string;
	size: number;
	modified: number;
	contents: Buffer;
};

export class FileStorageError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'FileStorageError';
		this.status = status;
	}
}

type SaveUploadedPdfsOptions = {
	month: string | null | undefined;
	files: FormDataEntryValue[];
	fileDate: string | null | undefined;
	startNumber: number;
	isIndex: boolean;
};

const invalidFilenameCharacters = /[<>:"|?*\u0000-\u001f]/;

function getStorageRoot() {
	const configuredRoot = env.TRUSTEE_FILE_STORAGE_DIR?.trim();
	if (configuredRoot) {
		return path.resolve(configuredRoot);
	}

	if (dev) {
		return path.resolve('storage', 'trustee-sales');
	}

	throw new FileStorageError(500, 'TRUSTEE_FILE_STORAGE_DIR is not configured.');
}

function resolveInside(basePath: string, ...segments: string[]) {
	const resolvedBase = path.resolve(basePath);
	const resolvedTarget = path.resolve(resolvedBase, ...segments);
	const baseWithSeparator = resolvedBase.endsWith(path.sep)
		? resolvedBase
		: `${resolvedBase}${path.sep}`;

	if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(baseWithSeparator)) {
		throw new FileStorageError(400, 'Invalid file path.');
	}

	return resolvedTarget;
}

function requireMonth(value: string | null | undefined) {
	const month = normalizeMonthSlug(value);
	if (!month) {
		throw new FileStorageError(400, 'Invalid month.');
	}
	return month;
}

function requirePdfFilename(value: string | null | undefined) {
	const filename = value?.trim();
	if (!filename) {
		throw new FileStorageError(400, 'Filename is required.');
	}

	if (
		filename.includes('/') ||
		filename.includes('\\') ||
		path.basename(filename) !== filename ||
		invalidFilenameCharacters.test(filename)
	) {
		throw new FileStorageError(400, 'Invalid filename.');
	}

	if (!filename.toLowerCase().endsWith('.pdf')) {
		throw new FileStorageError(400, 'Only PDF files are allowed.');
	}

	return filename;
}

function getMonthDirectory(monthValue: string | null | undefined) {
	const month = requireMonth(monthValue);
	return {
		month,
		directory: resolveInside(getStorageRoot(), month)
	};
}

function getPdfFilePath(monthValue: string | null | undefined, filenameValue: string | null | undefined) {
	const { month, directory } = getMonthDirectory(monthValue);
	const filename = requirePdfFilename(filenameValue);
	return {
		month,
		filename,
		filePath: resolveInside(directory, filename)
	};
}

function isMissingFileError(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as NodeJS.ErrnoException).code === 'ENOENT'
	);
}

function formatFileDate(value: string | null | undefined) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new FileStorageError(400, 'Invalid date format.');
	}

	const [year, month, day] = value.split('-');
	const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
	const isValid =
		probe.getUTCFullYear() === Number(year) &&
		probe.getUTCMonth() + 1 === Number(month) &&
		probe.getUTCDate() === Number(day);

	if (!isValid) {
		throw new FileStorageError(400, 'Invalid calendar date.');
	}

	return `${month}-${day}-${year}`;
}

function requireStartNumber(value: number) {
	if (!Number.isInteger(value) || value < 1) {
		throw new FileStorageError(400, 'Start number must be a positive whole number.');
	}

	return value;
}

function isPdfBuffer(buffer: Buffer) {
	return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

export async function listPdfFiles(monthValue: string | null | undefined): Promise<PdfFileEntry[]> {
	const { directory } = getMonthDirectory(monthValue);

	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (isMissingFileError(error)) {
			return [];
		}
		throw error;
	}

	const files = await Promise.all(
		entries
			.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
			.map(async (entry) => {
				const filePath = resolveInside(directory, entry.name);
				const stats = await stat(filePath);
				return {
					name: entry.name,
					size: stats.size,
					created: stats.birthtimeMs,
					time: stats.mtimeMs
				};
			})
	);

	return files.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name));
}

export async function listPdfFileNames(monthValue: string | null | undefined) {
	const files = await listPdfFiles(monthValue);
	return files.map((file) => file.name);
}

export async function saveUploadedPdfs(options: SaveUploadedPdfsOptions): Promise<SavedPdfResult> {
	const { month, directory } = getMonthDirectory(options.month);
	const formattedDate = formatFileDate(options.fileDate);
	const startNumber = requireStartNumber(options.startNumber);
	const files = options.files.filter(
		(file): file is File => file instanceof File && file.name !== '' && file.size > 0
	);

	if (files.length === 0) {
		throw new FileStorageError(400, 'At least one PDF file is required.');
	}

	await mkdir(directory, { recursive: true });

	let count = startNumber;
	const saved: string[] = [];

	for (const file of files) {
		if (file.type && file.type !== 'application/pdf') {
			throw new FileStorageError(400, `Only PDF files are allowed. "${file.name}" is not a PDF.`);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		if (!isPdfBuffer(buffer)) {
			throw new FileStorageError(400, `Only PDF files are allowed. "${file.name}" is not a PDF.`);
		}

		const newName = options.isIndex
			? `${formattedDate}_File_IDX.pdf`
			: `${formattedDate}_File_${String(count).padStart(3, '0')}.pdf`;

		const filePath = resolveInside(directory, newName);
		await writeFile(filePath, buffer);
		saved.push(newName);

		if (!options.isIndex) {
			count++;
		}
	}

	return { month, saved };
}

export async function deletePdfFiles(
	monthValue: string | null | undefined,
	filenameValues: unknown[]
) {
	const { directory } = getMonthDirectory(monthValue);
	const filenames = filenameValues.map((filename) => {
		if (typeof filename !== 'string') {
			throw new FileStorageError(400, 'Invalid filename.');
		}
		return requirePdfFilename(filename);
	});
	const deleted: string[] = [];

	for (const filename of filenames) {
		const filePath = resolveInside(directory, filename);
		try {
			await unlink(filePath);
			deleted.push(filename);
		} catch (error) {
			if (!isMissingFileError(error)) {
				throw error;
			}
		}
	}

	return deleted;
}

export async function getPdfFile(
	monthValue: string | null | undefined,
	filenameValue: string | null | undefined
): Promise<PdfFile> {
	const { filename, filePath } = getPdfFilePath(monthValue, filenameValue);

	try {
		const stats = await stat(filePath);
		if (!stats.isFile()) {
			throw new FileStorageError(404, 'PDF not found.');
		}

		return {
			name: filename,
			size: stats.size,
			modified: stats.mtimeMs,
			contents: await readFile(filePath)
		};
	} catch (error) {
		if (error instanceof FileStorageError) {
			throw error;
		}
		if (isMissingFileError(error)) {
			throw new FileStorageError(404, 'PDF not found.');
		}
		throw error;
	}
}
