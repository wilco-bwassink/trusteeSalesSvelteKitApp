import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import Page from './+page.svelte';

vi.mock('$app/paths', () => ({ base: '/trustee' }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/stores', () => ({ page: writable({ params: { month: 'january' } }) }));

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('public PDF listing', () => {
	it('distinguishes a failed request from an empty month and supports retry', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response('Failure', { status: 500 }))
			.mockResolvedValueOnce(new Response('[]'));
		vi.stubGlobal('fetch', fetch);
		render(Page);
		expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
		expect(screen.queryByText('No files posted for this month.')).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(await screen.findByText('No files posted for this month.')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
