<script lang="ts">
	import { enhance } from '$app/forms';

	let message = '';
	let isError = false;

	let selectedMonth = '';
	let files = [];
	let showToast = false;

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

	// Fetch files for selected month
	$: if (selectedMonth) {
		refreshFileList();
	}

	// Reusable fetch function
	async function refreshFileList() {
		if (!selectedMonth) return;

		try {
			const res = await fetch(`/list-files/${selectedMonth}`);
			if (res.ok) {
				files = await res.json();
			} else {
				files = [];
			}
		} catch {
			files = [];
		}
	}

	// Clear form inputs and message
	function clearForm() {
		const form = document.querySelector('form');
		if (!form) return;

		// Clear only specific inputs (leave the month dropdown untouched)
		const fileInput = form.querySelector('input[type="file"]');
		const dateInput = form.querySelector('input[type="date"]');
		const numberInput = form.querySelector('input[type="number"]');

		if (fileInput) fileInput.value = '';
		if (dateInput) dateInput.value = '';
		if (numberInput) numberInput.value = '1';

		// Clear toast state
		message = '';
		isError = false;
	}

	function handleEnhanceResult(result) {
		console.log('Enhance result:', result);

		if (result.type === 'error') {
			isError = true;
			message = result.error?.message || 'Upload failed.';
		} else if (result.type === 'failure') {
			isError = true;
			message = result.data?.message || 'Upload failed.';
		} else if (result.type === 'success') {
			isError = false;
			message = result.data?.message || 'Upload successful.';
			clearForm();
			refreshFileList();
		}

		// Delay both assignments to sync DOM render
		showToast = false;

		requestAnimationFrame(() => {
			// Assign message and showToast in sync
			if (result.type === 'error') {
				message = result.error?.message || 'Upload failed.';
			} else if (result.type === 'failure') {
				message = result.data?.message || 'Upload failed.';
			} else {
				message = result.data?.message || 'Upload successful.';
			}
			showToast = true;

			// Clear message + toast after 5 seconds
			setTimeout(() => {
				message = '';
				showToast = false;
			}, 5000);
		});
	}

	// Handle form submission results
	function handleEnhance() {
		return async (args) => {
			handleEnhanceResult(args.result);
		};
	}

	async function deleteFile(filename) {
		const confirmDelete = confirm(`Are you sure you want to delete "${filename}"?`);
		if (!confirmDelete) return;

		const res = await fetch('/delete-file', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ month: selectedMonth, filename })
		});

		if (res.ok) {
			const result = await res.json();
			console.log(result.message);
			refreshFileList();
			message = result.message;
			isError = false;
			showToast = true;

			setTimeout(() => {
				message = '';
				showToast = false;
			}, 5000);
		} else {
			message = 'Failed to delete file.';
			isError = true;
			showToast = true;

			setTimeout(() => {
				message = '';
				showToast = false;
			}, 5000);
		}
	}
</script>

<div id="container">
	<h1>Trustee Sale Upload</h1>

	<form method="POST" enctype="multipart/form-data" use:enhance={handleEnhance}>
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

	{#if showToast}
		<div class="toast" class:error={isError} class:success={!isError}>
			{message}
		</div>
	{/if}

	{#if selectedMonth}
		<h2>Files in {selectedMonth}:</h2>
		{#if files.length > 0}
			<ul class="file-grid">
				{#each files as file}
					<li class="file-item">
						<a href={`/${selectedMonth.toLowerCase()}/${file}`} target="_blank" rel="noopener"
							>{file}</a
						>
						<button on:click={() => deleteFile(file)}>🗑️</button>
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

	.file-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1rem;
		list-style: none;
		padding: 0;
		width: 100%;
		max-width: 800px;
	}

	.file-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f5f5f5;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.file-item a {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-right: 1rem;
	}

	.file-item button {
		background-color: #c0392b;
		color: white;
		border: none;
		padding: 0.3rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}
</style>
