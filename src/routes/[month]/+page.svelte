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

<h1>Files for {month.charAt(0).toUpperCase() + month.slice(1)}</h1>

{#if files.length}
	<table>
		<thead>
			<tr>
				<th>Filename</th>
				<th>Size</th>
				<th>Created</th>
				<th>Last Modified</th>
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
					<td>{new Date(file.created).toLocaleString()}</td>
					<td>{new Date(file.time).toLocaleString()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>Loading...</p>
{/if}
