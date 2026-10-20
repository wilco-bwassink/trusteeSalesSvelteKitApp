<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { base } from '$app/paths';
	import { MONTHS, getMonthLabel, type MonthSlug } from '$lib/months';

	export let data: {
		user: { username: string; authMethod: 'windows' | 'password' | 'development' } | null;
	};

	let message: string = '';
	let isError: boolean = false;
	let showToast: boolean = false;

	let selectedMonth: MonthSlug | '' = '';
	let files: string[] = [];
	let selectedFiles: File[] = [];
	let selectedForDeletion: Set<string> = new Set();

	let isDragging: boolean = false;
	let fileInput: HTMLInputElement;
	let isIndex: boolean = false;
	let isUploading = false;
	let isDeleting = false;
	let isLoadingFiles = false;
	let fileListError = '';
	let listRequestId = 0;

	$: refreshFileList(selectedMonth);

	async function refreshFileList(month = selectedMonth) {
		const currentRequest = ++listRequestId;
		selectedForDeletion = new Set();
		files = [];
		fileListError = '';
		isLoadingFiles = !!month;
		if (!month) return;
		try {
			const res = await fetch(`${base}/list-files/${month}`);
			if (!res.ok) throw new Error('Unable to list files.');
			const result = await res.json();
			if (currentRequest === listRequestId) files = result;
		} catch {
			if (currentRequest === listRequestId)
				fileListError = 'Unable to load files. Please try again.';
		} finally {
			if (currentRequest === listRequestId) isLoadingFiles = false;
		}
	}

	function clearForm() {
		const form = document.querySelector('form');
		if (!form) return;

		const fileInputEl = form.querySelector('input[type="file"]') as HTMLInputElement | null;
		const dateInput = form.querySelector('input[type="date"]') as HTMLInputElement | null;
		const numberInput = form.querySelector('input[type="number"]') as HTMLInputElement | null;
		const indexCheckbox = form.querySelector('input[name="isIndex"]') as HTMLInputElement | null;

		if (fileInputEl) fileInputEl.value = '';
		if (dateInput) dateInput.value = '';
		if (numberInput) numberInput.value = '1';
		if (indexCheckbox) indexCheckbox.checked = false;

		isIndex = false;
		selectedFiles = [];
		message = '';
		isError = false;
	}

	const handleEnhance: SubmitFunction = ({ cancel }) => {
		if (isUploading || isDeleting) {
			cancel();
			return;
		}
		isUploading = true;
		showToast = false;
		return async ({ result }) => {
			isUploading = false;
			if (result.type === 'success') {
				clearForm();
				isError = false;
				message =
					typeof result.data?.message === 'string' ? result.data.message : 'Upload successful.';
			} else {
				isError = true;
				message =
					result.type === 'failure' && typeof result.data?.message === 'string'
						? result.data.message
						: 'Upload failed. Your selection has been kept. Check the file list before retrying.';
			}
			showToast = true;
			await refreshFileList();
		};
	};

	async function deleteFile(filename: string) {
		const confirmDelete = confirm(`Are you sure you want to delete "${filename}"?`);
		if (!confirmDelete) return;

		await deleteFiles([filename]);
	}

	function handleDrop(event: DragEvent) {
		isDragging = false;
		if (isUploading || !event.dataTransfer) return;

		const droppedFiles = event.dataTransfer.files;
		const pdfs = Array.from(droppedFiles).filter((file: File) => file.type === 'application/pdf');

		if (pdfs.length === 0) {
			alert('Only PDF files are allowed.');
			return;
		}

		const dataTransfer = new DataTransfer();
		pdfs.forEach((file) => dataTransfer.items.add(file));
		fileInput.files = dataTransfer.files;
		selectedFiles = Array.from(dataTransfer.files);
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			selectedFiles = Array.from(target.files);
		}
	}

	function removeFile(index: number) {
		selectedFiles.splice(index, 1);
		selectedFiles = [...selectedFiles];

		const dataTransfer = new DataTransfer();
		selectedFiles.forEach((file) => dataTransfer.items.add(file));
		if (fileInput) {
			fileInput.files = dataTransfer.files;
		}
	}

	function toggleFileSelection(file: string) {
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
		await deleteFiles(Array.from(selectedForDeletion));
	}

	async function deleteFiles(filenames: string[]) {
		if (isDeleting || isUploading || !selectedMonth) return;
		isDeleting = true;
		try {
			const res = await fetch(`${base}/delete-file`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ month: selectedMonth, filenames })
			});
			const result = await res.json().catch(() => null);
			if (!res.ok) throw new Error(result?.message || 'Unable to delete files.');
			message = result?.message || 'Files deleted.';
			isError = false;
		} catch (error) {
			message = error instanceof Error ? error.message : 'Unable to delete files.';
			isError = true;
		} finally {
			isDeleting = false;
			showToast = true;
			await refreshFileList();
		}
	}
</script>

<nav>
	<span class="signed-in">Signed in as {data.user?.username ?? 'Unknown user'}</span>
	<a href={`${base}/upload`}>Upload</a> | <a href={`${base}/admin`}>Admin</a>
</nav>
<div id="container">
	<h1>Trustee Sale Upload</h1>

	<form method="POST" enctype="multipart/form-data" use:enhance={handleEnhance}>
		<label>
			Select Month Folder:
			<select name="month" bind:value={selectedMonth} disabled={isUploading || isDeleting} required>
				<option value="">Select a month</option>
				{#each MONTHS as month}
					<option value={month.slug}>{month.label}</option>
				{/each}
			</select>
		</label>

		<div class="fileDetails">
			<label>
				Date for Filename:
				<input type="date" name="fileDate" id="fileDate" disabled={isUploading} required />
			</label>

			<label>
				Start Number (e.g., 1):
				<input
					type="number"
					name="startNumber"
					min="1"
					value="1"
					disabled={isUploading}
					required
					id="startNumber"
				/>
			</label>

			<label>
				<span>Index file</span>
				<input type="checkbox" name="isIndex" bind:checked={isIndex} disabled={isUploading} />
			</label>
		</div>
		<!-- <label>
			Upload PDF(s):
			<input type="file" name="files" multiple accept="application/pdf" required />
		</label> -->
		<div
			class="dropzone"
			role="region"
			aria-label="PDF file drop area"
			on:dragover|preventDefault={() => (isDragging = true)}
			on:dragleave={() => (isDragging = false)}
			on:drop|preventDefault={handleDrop}
			class:dragging={isDragging}
		>
			<p>Drag & drop PDF files here or click to browse</p>
			<input
				bind:this={fileInput}
				disabled={isUploading}
				type="file"
				name="files"
				accept="application/pdf"
				multiple={!isIndex}
				required
				on:change={handleFileSelect}
			/>
		</div>

		{#if selectedFiles.length > 0}
			<ul class="preview-list">
				{#each selectedFiles as file, i}
					<li>
						<span>{file.name}</span>
						<button type="button" disabled={isUploading} on:click={() => removeFile(i)}>✖</button>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="button-group">
			<button type="submit" disabled={isUploading || isDeleting}
				>{isUploading ? 'Uploading…' : 'Upload'}</button
			>
			<button type="button" disabled={isUploading} on:click={clearForm}>Clear</button>
		</div>
	</form>

	{#if showToast}
		<div
			class="toast"
			role={isError ? 'alert' : 'status'}
			class:error={isError}
			class:success={!isError}
		>
			{message}
		</div>
	{/if}

	{#if selectedMonth}
		<h2>Files in {getMonthLabel(selectedMonth)}:</h2>
		{#if fileListError}
			<p role="alert">{fileListError}</p>
			<button on:click={() => refreshFileList()}>Try again</button>
		{:else if isLoadingFiles}
			<p>Loading files…</p>
		{:else if files.length > 0}
			<ul class="file-grid">
				{#each files as file}
					<li>
						<div
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
									href={`${base}/files/${selectedMonth}/${encodeURIComponent(file)}`}
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
								disabled={isDeleting || isUploading}
								on:click|stopPropagation={() => deleteFile(file)}
								aria-label={`Delete ${file}`}
							>
								<!-- 🗑️ -->Remove
							</button>
						</div>
					</li>
				{/each}
			</ul>

			{#if selectedForDeletion.size > 0}
				<div class="bulk-delete-bar">
					<button disabled={isDeleting || isUploading} on:click={deleteSelectedFiles}
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
	nav {
		display: flex;
		justify-content: end;
		align-items: center;
		gap: 0.5em;
	}
	.signed-in {
		margin-right: auto;
		color: #555;
		font-size: 0.9rem;
	}
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
	.fileDetails {
		display: flex;
		gap: 1em;

		#startNumber {
			width: 50px;
		}

		& label {
			display: flex;
			flex-direction: column;
			align-items: center;
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
		/* border-color: #0077cc; */
		border-color: var(--wc-main);
		/* background-color: #eef6ff; */
		background-color: var(--wc-light_blue-60);
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
		/* align-self: flex-end; */
		margin-top: 0.5rem;
		background-color: #c0392b;
		color: white;
		border: none;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
