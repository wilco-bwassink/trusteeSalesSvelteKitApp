<script lang="ts">
	import { salesData } from '../../stores/sales';
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import type { SaleRecord } from '../../types';

	export let data: {
		user: { username: string; authMethod: 'windows' | 'password' | 'development' } | null;
	};

	let sales: SaleRecord[] = [];
	let showToast = false;

	function showSavedToast() {
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 2000);
	}

	const unsubscribe = salesData.subscribe((value) => {
		sales = value;
	});
	onDestroy(unsubscribe);

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
		await fetch(`${base}/api/sales`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(sales)
		});
		showSavedToast();
		salesData.set([...sales]);
	}
</script>

<nav>
	<span class="signed-in">Signed in as {data.user?.username ?? 'Unknown user'}</span>
	<a href={`${base}/upload`}>Upload</a> | <a href={`${base}/admin`}>Admin</a>
	<form method="POST" action={`${base}/logout`}>
		<button class="logout" type="submit">Sign out</button>
	</form>
</nav>
<div id="container">
	<h2>Trustee Sales Admin Panel</h2>
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
						<input type="text" value={sale.date} on:input={(e) => updateDate(index, e)} />
					</td>
					<td>
						<input
							type="text"
							value={sale.mapUrl}
							on:input={(e) => updateMapUrl(index, e)}
							placeholder="Map URL"
						/>
					</td>
					<td class="map">
						<button on:click={() => toggleMap(index)}>
							{sale.showMap ? 'Hide Map' : 'Show Map'}
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<button on:click={saveToFile} style="margin-top: 1rem;">Save All</button>
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
	nav form {
		margin: 0 0 0 0.5rem;
	}
	nav .logout {
		padding: 0.25rem 0.5rem;
		background: #6b7280;
		font-size: 0.85rem;
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
