<script lang="ts">
	import { salesData } from '../../stores/sales';
	import { base } from '$app/paths';
	import type { SaleRecord } from '../../types';

	export let data: {
		user: { username: string; authMethod: 'windows' | 'password' | 'development' } | null;
		sales: SaleRecord[];
		revision: string;
		loadError: string;
	};

	let sales: SaleRecord[] = data.sales.map((sale) => ({ ...sale }));
	let revision = data.revision;
	let saveError = '';
	let isSaving = false;
	let showToast = false;

	function showSavedToast() {
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 2000);
	}

	function updateDate(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		sales[index].date = target.value;
	}

	function updateMapUrl(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		sales[index].mapUrl = target.value;
	}

	function toggleMap(index: number) {
		sales[index].showMap = !sales[index].showMap;
	}

	async function saveToFile() {
		if (isSaving || !revision) return;
		isSaving = true;
		saveError = '';
		showToast = false;
		try {
			const response = await fetch(`${base}/admin/api/sales`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'If-Match': revision },
				body: JSON.stringify(sales)
			});
			const result = await response.json().catch(() => null);
			if (!response.ok || !result?.success || !result.revision || !Array.isArray(result.sales)) {
				throw new Error(
					result?.message || 'The schedule could not be saved. Your edits have been kept on screen.'
				);
			}
			revision = result.revision;
			sales = result.sales;
			salesData.set(sales.map((sale) => ({ ...sale })));
			showSavedToast();
		} catch (error) {
			saveError =
				error instanceof Error
					? error.message
					: 'Unable to save. Your edits have been kept on screen.';
		} finally {
			isSaving = false;
		}
	}
</script>

<nav>
	<span class="signed-in">Signed in as {data.user?.username ?? 'Unknown user'}</span>
	<a href={`${base}/upload`}>Upload</a> | <a href={`${base}/admin`}>Admin</a>
</nav>
<div id="container">
	<h2>Trustee Sales Admin Panel</h2>
	{#if data.loadError || saveError}
		<p role="alert">{data.loadError || saveError}</p>
	{/if}
	{#if showToast}
		<div class="toast">✔️ Sales data saved!</div>
	{/if}
	<table>
		<thead>
			<tr>
				<th>Month</th>
				<th>Sale Date</th>
				<th>Map URL</th>
				<th>Map Visibility</th>
			</tr>
		</thead>
		<tbody>
			{#each sales as sale, index}
				<tr>
					<td>{sale.month}</td>
					<td class="date">
						<input
							aria-label={`${sale.month} sale date`}
							disabled={isSaving}
							type="text"
							value={sale.date}
							on:input={(e) => updateDate(index, e)}
						/>
					</td>
					<td>
						<input
							type="text"
							aria-label={`${sale.month} map URL`}
							disabled={isSaving}
							value={sale.mapUrl}
							on:input={(e) => updateMapUrl(index, e)}
							placeholder="Map URL"
						/>
					</td>
					<td class="map">
						<button disabled={isSaving} on:click={() => toggleMap(index)}>
							{sale.showMap ? 'Hide Map' : 'Show Map'}
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<button disabled={isSaving || !revision} on:click={saveToFile} style="margin-top: 1rem;">
		{isSaving ? 'Saving…' : 'Save All'}
	</button>
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
	table {
		width: 60vw;
		border-collapse: collapse;
	}
	th,
	td {
		padding: 10px;
		border: 1px solid #ddd;
	}
	th {
		background: #f4f4f4;
		font-weight: bold;
	}

	.date {
		width: 100px;
	}
	.map {
		text-align: center;
	}
	input {
		width: 100%;
	}
	button {
		padding: 0.5rem 1rem;
		background-color: var(--wc-main);
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
	.toast {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: #4caf50;
		color: white;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		font-weight: bold;
		z-index: 1000;
		animation: fadeInOut 2s ease;
	}

	@keyframes fadeInOut {
		0% {
			opacity: 0;
			transform: translateY(10px);
		}
		10% {
			opacity: 1;
			transform: translateY(0);
		}
		90% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateY(10px);
		}
	}
</style>
