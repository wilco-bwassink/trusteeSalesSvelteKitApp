import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getMonthLabel } from '$lib/months';
import { FileStorageError, saveUploadedPdfs } from '$lib/server/file-storage';

export const load: PageServerLoad = ({ locals }) => {
	return {
		user: locals.user
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const month = form.get('month')?.toString();
		const files = form.getAll('files');
		const fileDate = form.get('fileDate')?.toString();
		const startNumber = Number(form.get('startNumber')?.toString() || '1');
		const isIndex = form.get('isIndex') === 'on';

		try {
			const result = await saveUploadedPdfs({ month, files, fileDate, startNumber, isIndex });
			const label = isIndex ? 'index file' : `${result.saved.length} file(s)`;
			return {
				message: `Uploaded ${label} to ${getMonthLabel(result.month)} with renamed format.`
			};
		} catch (error) {
			if (error instanceof FileStorageError) {
				return fail(error.status, { message: error.message });
			}
			throw error;
		}
	}
};
