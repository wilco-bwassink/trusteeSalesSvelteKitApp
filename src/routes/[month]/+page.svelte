<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let files = [];
	let month = '';

	// Get the current month from the URL
	$: month = $page.params.month;

	onMount(async () => {
		try {
			const response = await fetch(`/api/files/${month}`);
			if (!response.ok) throw new Error('Failed to fetch files');

			const data = await response.json();
			files = data;
		} catch (error) {
			console.error(error);
		}
	});

	function formatSize(bytes) {
		if (bytes === 0) return '0 B';
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
	}
</script>

<a href="/">Back to Months</a>
<div id="container">
	<h1>Files for {month.charAt(0).toUpperCase() + month.slice(1)}</h1>
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
							<a href={'/' + month + '/' + file.name} target="_blank" rel="noopener noreferrer">
								{file.name}
							</a>
						</td>
						<td>{formatSize(file.size)}</td>
						<td>{new Date(file.created).toLocaleDateString()}</td>
						<!-- <td>{new Date(file.time).toLocaleString()}</td> -->
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p>Loading...</p>
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
</style>
