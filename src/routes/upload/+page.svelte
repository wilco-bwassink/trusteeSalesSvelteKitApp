<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	let message = '';
	let isError = false;
	let showToast = false;

	let selectedMonth = '';
	let files = [];
	let selectedFiles = [];
	let selectedForDeletion = new Set();

	let isDragging = false;
	let fileInput;

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
		refreshFileList();
	}

	async function refreshFileList() {
		if (!selectedMonth) return;
		try {
			const res = await fetch(`/list-files/${selectedMonth}`);
			files = res.ok ? await res.json() : [];
		} catch {
			files = [];
		}
	}

	function clearForm() {
		const form = document.querySelector('form');
		if (!form) return;

		const fileInputEl = form.querySelector('input[type="file"]');
		const dateInput = form.querySelector('input[type="date"]');
		const numberInput = form.querySelector('input[type="number"]');

		if (fileInputEl) fileInputEl.value = '';
		if (dateInput) dateInput.value = '';
		if (numberInput) numberInput.value = '1';

		selectedFiles = [];
		message = '';
		isError = false;
	}

	async function handleEnhanceResult(result) {
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
			await refreshFileList();
		}

		await tick(); // ensures message is flushed before showing toast
		showToast = true;

		setTimeout(() => {
			showToast = false;
			message = '';
		}, 5000);
	}

	function handleEnhance() {
		return async (args) => {
			await handleEnhanceResult(args.result);
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
			message = result.message;
			isError = false;
			refreshFileList();
		} else {
			message = 'Failed to delete file.';
			isError = true;
		}

		await tick();
		showToast = true;

		setTimeout(() => {
			message = '';
			showToast = false;
		}, 5000);
	}

	function handleDrop(event) {
		isDragging = false;
		const droppedFiles = event.dataTransfer.files;
		const pdfs = Array.from(droppedFiles).filter((file) => file.type === 'application/pdf');

		if (pdfs.length === 0) {
			alert('Only PDF files are allowed.');
			return;
		}

		const dataTransfer = new DataTransfer();
		pdfs.forEach((file) => dataTransfer.items.add(file));
		fileInput.files = dataTransfer.files;
		selectedFiles = Array.from(dataTransfer.files);
	}

	function handleFileSelect(event) {
		selectedFiles = Array.from(event.target.files);
	}

	function removeFile(index) {
		selectedFiles.splice(index, 1);
		selectedFiles = [...selectedFiles];

		const dataTransfer = new DataTransfer();
		selectedFiles.forEach((file) => dataTransfer.items.add(file));
		if (fileInput) {
			fileInput.files = dataTransfer.files;
		}
	}

	function toggleFileSelection(file) {
		if (selectedForDeletion.has(file)) {
			selectedForDeletion.delete(file);
		} else {
			selectedForDeletion.add(file);
		}
		selectedForDeletion = new Set(selectedForDeletion);
	}

	function clearSelectedFiles() {
		selectedForDeletion = new Set();
	}

	async function deleteSelectedFiles() {
		const confirmDelete = confirm(`Delete ${selectedForDeletion.size} selected file(s)?`);
		if (!confirmDelete) return;

		const filenames = Array.from(selectedForDeletion);

		const res = await fetch('/delete-file', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ month: selectedMonth, filenames })
		});

		if (res.ok) {
			const result = await res.json();
			message = result.message || `Deleted ${filenames.length} file(s).`;
			isError = false;
			selectedForDeletion = new Set();
			refreshFileList();
		} else {
			message = 'Bulk delete failed.';
			isError = true;
		}

		await tick();
		showToast = true;

		setTimeout(() => {
			message = '';
			showToast = false;
		}, 5000);
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
			Date for Filename:
			<input type="date" name="fileDate" required />
		</label>

		<label>
			Start Number (e.g., 1):
			<input type="number" name="startNumber" min="1" value="1" required />
		</label>
		<!-- <label>
			Upload PDF(s):
			<input type="file" name="files" multiple accept="application/pdf" required />
		</label> -->
		<div
			class="dropzone"
			on:dragover|preventDefault={() => (isDragging = true)}
			on:dragleave={() => (isDragging = false)}
			on:drop|preventDefault={handleDrop}
			class:dragging={isDragging}
		>
			<p>Drag & drop PDF files here or click to browse</p>
			<input
				bind:this={fileInput}
				type="file"
				name="files"
				accept="application/pdf"
				multiple
				required
				on:change={handleFileSelect}
			/>
		</div>

		{#if selectedFiles.length > 0}
			<ul class="preview-list">
				{#each selectedFiles as file, i}
					<li>
						<span>{file.name}</span>
						<button type="button" on:click={() => removeFile(i)}>✖</button>
					</li>
				{/each}
			</ul>
		{/if}

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
					<li
						class="file-card"
						class:selected={selectedForDeletion.has(file)}
						role="checkbox"
						aria-checked={selectedForDeletion.has(file)}
						tabindex="0"
						on:click={() => toggleFileSelection(file)}
						on:keydown={(e) =>
							e.key === 'Enter' || e.key === ' ' ? toggleFileSelection(file) : null}
					>
						<div class="file-content">
							<p class="file-name" aria-label={`File name: ${file}`}>{file}</p>
							<a
								href={`/${selectedMonth.toLowerCase()}/${file}`}
								target="_blank"
								rel="noopener"
								on:click|stopPropagation
								aria-label={`View ${file}`}
							>
								View
							</a>
						</div>

						<button
							class="delete-button"
							type="button"
							on:click|stopPropagation={() => deleteFile(file)}
							aria-label={`Delete ${file}`}
						>
							🗑️
						</button>
					</li>
				{/each}
			</ul>

			{#if selectedForDeletion.size > 0}
				<div class="bulk-delete-bar">
					<button on:click={deleteSelectedFiles}
						>Delete Selected ({selectedForDeletion.size})</button
					>
					<button on:click={clearSelectedFiles}>Cancel</button>
				</div>
			{/if}
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

	.dropzone {
		width: 100%;
		max-width: 400px;
		min-height: 120px;
		border: 2px dashed #ccc;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
		cursor: pointer;
		position: relative;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.dropzone.dragging {
		border-color: var(--wc-main);
		background-color: #f0f8ff;
	}

	.dropzone input[type='file'] {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.preview-list {
		margin-top: 1rem;
		width: 100%;
		max-width: 400px;
		padding-left: 1rem;
		list-style-type: disc;
		font-size: 0.95rem;
		color: #333;
	}

	.preview-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.6rem;
		background: #f9f9f9;
		border-radius: 4px;
		margin-bottom: 0.5rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.preview-list button {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.bulk-delete-bar {
		margin-top: 1rem;
		display: flex;
		gap: 1rem;
	}

	.bulk-delete-bar button {
		background-color: #c0392b;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
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

	.file-card {
		cursor: pointer;
		background: #f9f9f9;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		border: 2px solid transparent;
		transition:
			border 0.2s,
			background 0.2s;
	}

	.file-card:hover {
		border-color: #ddd;
	}

	.file-card.selected {
		border-color: #0077cc;
		background-color: #eef6ff;
	}

	.file-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.file-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.delete-button {
		align-self: flex-end;
		margin-top: 0.5rem;
		background-color: #c0392b;
		color: white;
		border: none;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
