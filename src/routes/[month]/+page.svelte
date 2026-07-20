<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { getMonthLabel, normalizeMonthSlug, type MonthSlug } from '$lib/months';

	type FileEntry = {
		name: string;
		size: number;
		created: number;
		time: number;
	};

	let files: FileEntry[] = [];
	let month: MonthSlug | null = null;
	let monthLabel = '';
	let requestedMonth = '';
	let isLoading = true;

	// Get the current month from the URL
	$: month = normalizeMonthSlug($page.params.month);
	$: monthLabel = getMonthLabel(month);

	$: if (browser && month && month !== requestedMonth) {
		loadFiles(month);
	}
	$: if (browser && !month) {
		files = [];
		isLoading = false;
		requestedMonth = '';
	}

	async function loadFiles(monthSlug: MonthSlug) {
		requestedMonth = monthSlug;
		isLoading = true;
		try {
			const response = await fetch(`${base}/api/files/${monthSlug}`);
			if (!response.ok) throw new Error('Failed to fetch files');

			const data = await response.json();
			files = data;
		} catch (error) {
			console.error(error);
			files = [];
		} finally {
			isLoading = false;
		}
	}

	function formatSize(bytes: number) {
		if (!bytes || isNaN(bytes)) return 'Unknown Size'; // Handle missing size
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
	}
</script>
<svelte:head>
<script async src="https://docaccess.com/docbox.js"></script>
</svelte:head>

<a href={`${base}`}>Back to Months</a>
<div id="container">
	<h1>Files for {monthLabel}</h1>
	<p>
		The Trustee Sales are held the first Tuesday of every month from 10:00 AM to 4:00 PM at the
		Northeast side of the Justice Center Annex at 405 Martin Luther King, Georgetown, Texas, 78626.
		The County Clerk's office has nothing to do with the sale itself. We only post the notice of
		sales and then after a sale is done the Trustee's Deed is recorded with us.
	</p>
	<p>
		The first file labeled "File_Idx" is the alphabetical index of the Notice of Trustee Sales
		filed.
	</p>

	{#if files.length}
		<table>
			<thead>
				<tr>
					<th>Filename</th>
					<th>Size</th>
					<th>Created</th>
					<!-- <th>Last Modified</th> -->
				</tr>
			</thead>
			<tbody>
				{#each files as file}
					<tr>
						<td>
							<a
								href={`${base}/files/${month ?? ''}/${encodeURIComponent(file.name)}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{file.name}
							</a>
						</td>
						<td>{formatSize(file.size)}</td>
						<td>{file.created ? new Date(file.created).toLocaleDateString() : 'Unknown Date'}</td>
						<!-- <td>{new Date(file.time).toLocaleString()}</td> -->
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if isLoading}
		<p>Loading...</p>
	{:else}
		<p>No files posted for this month.</p>
	{/if}
	<p>
		Please note: The data depicted in the above table is the most current data available. It is read
		each time this page is called. If you believe that this information is in error, please contact
		the <a href="mailto:webmaster@wilco.org">Webmaster</a>.
	</p>
</div>

<style>
	#container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	table {
		width: 40vw;
	}
	tr:nth-child(even) {
		background-color: var(--wc-tan-60);
	}
</style>
