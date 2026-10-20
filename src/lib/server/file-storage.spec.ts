import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deletePdfFiles, listPdfFileNames, saveUploadedPdfs } from './file-storage';

const { environment } = vi.hoisted(() => ({
	environment: {} as Record<string, string>
}));
vi.mock('$env/dynamic/private', () => ({ env: environment }));
vi.mock('$app/environment', () => ({ dev: false }));

function upload(overrides = {}) {
	return {
		month: 'january',
		fileDate: '2026-01-06',
		startNumber: 1,
		isIndex: false,
		files: [new File(['%PDF-original'], 'notice.pdf', { type: 'application/pdf' })],
		...overrides
	};
}

describe('safe PDF uploads', () => {
	let directory: string;
	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'trustee-pdf-test-'));
		environment.TRUSTEE_FILE_STORAGE_DIR = directory;
	});
	afterEach(async () => {
		delete environment.TRUSTEE_FILE_STORAGE_DIR;
		await rm(directory, { recursive: true, force: true });
	});

	it('rejects duplicates and preserves the original PDF', async () => {
		await saveUploadedPdfs(upload());
		await expect(
			saveUploadedPdfs(
				upload({
					files: [new File(['%PDF-replacement'], 'other.pdf')]
				})
			)
		).rejects.toMatchObject({ status: 409 });
		expect(await readFile(path.join(directory, 'january', '01-06-2026_File_001.pdf'), 'utf8')).toBe(
			'%PDF-original'
		);
	});

	it('rejects multiple index files before publishing anything', async () => {
		const file = new File(['%PDF-index'], 'index.pdf');
		await expect(
			saveUploadedPdfs(upload({ isIndex: true, files: [file, file] }))
		).rejects.toMatchObject({ status: 400 });
		expect(await listPdfFileNames('january')).toEqual([]);
	});

	it('validates every file before publishing the first one', async () => {
		await expect(
			saveUploadedPdfs(
				upload({
					files: [...upload().files, new File(['invalid'], 'invalid.pdf')]
				})
			)
		).rejects.toMatchObject({ status: 400 });
		expect(await listPdfFileNames('january')).toEqual([]);
	});

	it('rolls back new files when a later filename collides', async () => {
		await saveUploadedPdfs(upload({ startNumber: 2 }));
		await expect(
			saveUploadedPdfs(upload({ files: [...upload().files, ...upload().files] }))
		).rejects.toMatchObject({ status: 409 });
		expect(await listPdfFileNames('january')).toEqual(['01-06-2026_File_002.pdf']);
	});

	it('prevents simultaneous uploads from replacing one another', async () => {
		const results = await Promise.allSettled([
			saveUploadedPdfs(upload()),
			saveUploadedPdfs(upload())
		]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(await listPdfFileNames('january')).toEqual(['01-06-2026_File_001.pdf']);
	});

	it('still supports explicit deletion and releases the month lock', async () => {
		const saved = await saveUploadedPdfs(upload());
		expect(await deletePdfFiles('january', saved.saved)).toEqual(saved.saved);
		expect(await listPdfFileNames('january')).toEqual([]);
		await expect(saveUploadedPdfs(upload())).resolves.toMatchObject({ saved: saved.saved });
	});
});
