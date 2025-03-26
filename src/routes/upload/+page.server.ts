import type { Actions } from './$types';
import { json, error, fail } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const month = form.get('month')?.toString();
		const files = form.getAll('files');
		const fileDate = form.get('fileDate')?.toString();
		const startNumber = parseInt(form.get('startNumber')?.toString() || '1');
		const isIndex = form.get('isIndex') === 'on'; // 👈 checkbox sends "on" if checked

		if (!month || !fileDate || files.length === 0) {
			return fail(400, { message: 'Month, date, and files are required.' });
		}

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
			return fail(400, { message: 'Invalid month selected.' });
		}

		const parsedDate = new Date(fileDate);
		if (isNaN(parsedDate.getTime())) {
			return fail(400, { message: 'Invalid date format.' });
		}

		const formattedDate = `${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(
			parsedDate.getDate()
		).padStart(2, '0')}-${parsedDate.getFullYear()}`;

		const uploadDir = path.resolve('static', month);
		await mkdir(uploadDir, { recursive: true });

		let count = startNumber;

		for (const file of files) {
			if (!(file instanceof File)) continue;
			if (file.type !== 'application/pdf') {
				return fail(400, { message: `Only PDF files are allowed. "${file.name}" is not a PDF.` });
			}

			const buffer = Buffer.from(await file.arrayBuffer());

			// 👇 Rename logic based on index mode
			const newName = isIndex
				? `${formattedDate}_IDX.pdf`
				: `${formattedDate}_File_${String(count).padStart(3, '0')}.pdf`;

			const filePath = path.join(uploadDir, newName);
			await writeFile(filePath, buffer);

			if (!isIndex) count++; // 👈 skip counting if it's an index file
		}

		const label = isIndex ? 'index file' : `${files.length} file(s)`;
		return {
			message: `Uploaded ${label} to ${month}/ with renamed format.`
		};
	}
};
