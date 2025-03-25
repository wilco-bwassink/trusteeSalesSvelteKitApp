<script lang="ts">
	import { enhance } from '$app/forms';

	let message;
	let isError = false;

	let selectedMonth = '';
	let files = [];

	const months = [
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

	$: if (selectedMonth) {
		fetch(`/list-files/${selectedMonth}`).then(async (res) => {
			if (res.ok) {
				files = await res.json();
			} else {
				files = [];
			}
		});
	}

	function clearForm() {
		const form = document.querySelector('form');
		if (form) {
			form.reset();
		}
		message = '';
		isError = false;
	}
</script>

<div id="container">
	<h1>Trustee Sale Upload</h1>
	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			return async ({ result }) => {
				console.log('TOAST RESULT:', result);

				if (result.type === 'error') {
					isError = true;
					message = result.error?.message || 'Upload failed.';
				} else if (result.type === 'failure') {
					isError = true;
					message = result.data?.message || 'Upload failed.';
				} else if (result.type === 'success') {
					isError = false;
					message = result.data?.message || 'Upload successful.';
				} else {
					message = '';
				}

				setTimeout(() => (message = ''), 5000);
			};
		}}
	>
		<label>
			Select Month Folder:
			<select name="month" bind:value={selectedMonth} required>
				<option value="">Select a month</option>
				{#each months as month}
					<option value={month}>{month}</option>
				{/each}
			</select>
		</label>

		<label>
			Upload PDF(s):
			<input type="file" name="files" multiple accept="application/pdf" required />
		</label>

		<label>
			Date for Filename:
			<input type="date" name="fileDate" required />
		</label>

		<label>
			Start Number (e.g., 1):
			<input type="number" name="startNumber" min="1" value="1" required />
		</label>

		<div class="button-group">
			<button type="submit">Upload</button>
			<button type="button" on:click={clearForm}>Clear</button>
		</div>
	</form>
	<!-- Toast -->
	{#if message}
		<div class={`toast ${isError ? 'error' : 'success'}`}>
			{message}
		</div>
	{/if}

	<!-- List files for selected month -->
	{#if selectedMonth}
		<h2>Files in {selectedMonth}:</h2>
		{#if files.length > 0}
			<ul>
				{#each files as file}
					<li>
						<a href={`/${selectedMonth}/${file}`} target="_blank" rel="noopener">
							{file}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p>No files found in this folder.</p>
		{/if}
	{/if}
</div>

<style>
	#container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	form {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	}

	.button-group {
		display: flex;
		gap: 1rem;
	}

	.button-group button {
		padding: 0.5rem 1rem;
		background-color: var(--wc-main);
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.button-group button:nth-child(2) {
		background-color: #990000;
	}

	button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background-color: var(--wc-main);
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.toast {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 6px;
		font-weight: bold;
		animation: fadeIn 0.3s ease;
	}

	.toast.success {
		background-color: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.toast.error {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
