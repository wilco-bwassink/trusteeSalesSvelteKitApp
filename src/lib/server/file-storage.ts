import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { mkdir, readFile, readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { normalizeMonthSlug, type MonthSlug } from '$lib/months';
import { atomicWriteFile, hasErrorCode, withFileLock } from './safe-files';

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

// Filenames must not contain ASCII control characters, including NUL.
// eslint-disable-next-line no-control-regex
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

function getPdfFilePath(
	monthValue: string | null | undefined,
	filenameValue: string | null | undefined
) {
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
	if (!Number.isSafeInteger(value) || value < 1) {
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
	if (options.isIndex && files.length !== 1) {
		throw new FileStorageError(400, 'Upload exactly one PDF when Index file is selected.');
	}
	if (!Number.isSafeInteger(startNumber + files.length - 1)) {
		throw new FileStorageError(400, 'The file numbering is too large.');
	}

	let count = startNumber;
	const prepared: { name: string; contents: Buffer }[] = [];

	// Validate the entire selection before publishing any file.
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

		prepared.push({ name: newName, contents: buffer });

		if (!options.isIndex) {
			count++;
		}
	}

	await mkdir(directory, { recursive: true });
	try {
		return await withFileLock(resolveInside(directory, '.write.lock'), async () => {
			const saved: string[] = [];
			try {
				for (const file of prepared) {
					try {
						await atomicWriteFile(resolveInside(directory, file.name), file.contents, false);
					} catch (error) {
						if (hasErrorCode(error, 'EEXIST')) {
							throw new FileStorageError(
								409,
								`"${file.name}" already exists. No files were uploaded. Choose a different date or start number.`
							);
						}
						throw error;
					}
					saved.push(file.name);
				}
			} catch (error) {
				// Roll back only files created by this request. The month lock prevents
				// another upload or deletion from changing these files during rollback.
				await Promise.all(saved.map((name) => unlink(resolveInside(directory, name))));
				throw error;
			}
			return { month, saved };
		});
	} catch (error) {
		if (hasErrorCode(error, 'EEXIST')) {
			throw new FileStorageError(409, 'Another file operation is in progress. Please try again.');
		}
		throw error;
	}
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
	await mkdir(directory, { recursive: true });
	try {
		return await withFileLock(resolveInside(directory, '.write.lock'), async () => {
			const deleted: string[] = [];
			for (const filename of filenames) {
				try {
					await unlink(resolveInside(directory, filename));
					deleted.push(filename);
				} catch (error) {
					if (!isMissingFileError(error)) throw error;
				}
			}
			return deleted;
		});
	} catch (error) {
		if (hasErrorCode(error, 'EEXIST')) {
			throw new FileStorageError(409, 'Another file operation is in progress. Please try again.');
		}
		throw error;
	}
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
