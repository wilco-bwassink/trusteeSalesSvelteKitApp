import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import Page from './+page.svelte';

vi.mock('$app/paths', () => ({ base: '/trustee' }));
vi.mock('../../stores/sales', () => ({ salesData: writable([]) }));

const data = {
	user: null,
	sales: [{ month: 'January', date: '1/6/2026', showMap: false, mapUrl: '' }],
	revision: '"original"',
	loadError: ''
};

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('schedule save feedback', () => {
	it('keeps edits and reports a rejected save instead of success', async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ message: 'Schedule changed.' }), { status: 409 })
			);
		vi.stubGlobal('fetch', fetch);
		render(Page, { data });
		const date = screen.getByLabelText('January sale date');
		await fireEvent.input(date, { target: { value: '1/13/2026' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save All' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Schedule changed.');
		expect(date).toHaveValue('1/13/2026');
		expect(screen.queryByText(/Sales data saved/)).not.toBeInTheDocument();
		expect(fetch).toHaveBeenCalledWith(
			'/trustee/admin/api/sales',
			expect.objectContaining({
				headers: { 'Content-Type': 'application/json', 'If-Match': '"original"' }
			})
		);
	});

	it('reports network failures and permits retrying', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));
		render(Page, { data });
		await fireEvent.click(screen.getByRole('button', { name: 'Save All' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
		expect(screen.getByRole('button', { name: 'Save All' })).toBeEnabled();
	});

	it('uses the new revision after a confirmed save', async () => {
		const fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: true, revision: '"new"', sales: data.sales })
		});
		vi.stubGlobal('fetch', fetch);
		render(Page, { data });
		await fireEvent.click(screen.getByRole('button', { name: 'Save All' }));
		await waitFor(() => expect(screen.getByText(/Sales data saved/)).toBeInTheDocument());
		await fireEvent.click(screen.getByRole('button', { name: 'Save All' }));
		expect(fetch.mock.calls[1][1].headers['If-Match']).toBe('"new"');
	});

	it('disables saving when the schedule could not load', () => {
		render(Page, {
			data: { ...data, sales: [], revision: '', loadError: 'Unable to load schedule.' }
		});
		expect(screen.getByRole('alert')).toHaveTextContent('Unable to load schedule.');
		expect(screen.getByRole('button', { name: 'Save All' })).toBeDisabled();
	});
});
