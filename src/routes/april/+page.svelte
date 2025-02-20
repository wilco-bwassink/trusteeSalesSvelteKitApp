<script>
	import { onMount } from 'svelte';
	let files = [];

	onMount(async () => {
		const response = await fetch('/api/files');
		files = await response.json();
	});

	// Base folder path for serving static files
	const basePath = '/files/';
</script>

<h1>Files in Chronological Order</h1>

{#if files.length}
	<ul>
		{#each files as file}
			<li>
				<a href={basePath + file.name} target="_blank" rel="noopener noreferrer">
					{file.name}
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<p>Loading...</p>
{/if}
