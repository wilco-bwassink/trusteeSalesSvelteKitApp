<script lang="ts">
	import { salesData } from '../../stores/sales';
	import type { SaleRecord } from '../../types';
	import { onDestroy } from 'svelte';

	let sales: SaleRecord[] = [];
	const unsubscribe = salesData.subscribe((value) => (sales = value));
	onDestroy(unsubscribe);

	function updateDate(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		sales[index].date = target.value;
		salesData.set([...sales]); // Update store
	}

	function toggleMap(index: number) {
		sales[index].showMap = !sales[index].showMap;
		salesData.set([...sales]); // Update store
	}
</script>

<h2>Admin Panel</h2>

<table>
	<thead>
		<tr>
			<th>Month</th>
			<th>Sale Date</th>
			<th>Map Visibility</th>
		</tr>
	</thead>
	<tbody>
		{#each sales as sale, index}
			<tr>
				<td>{sale.month}</td>
				<td>
					<input type="text" bind:value={sale.date} on:change={(e) => updateDate(index, e)} />
				</td>
				<td>
					<button on:click={() => toggleMap(index)}>
						{sale.showMap ? 'Hide Map' : 'Show Map'}
					</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 10px;
		border: 1px solid #ddd;
	}

	th {
		background: #f4f4f4;
	}

	input {
		width: 100px;
	}

	button {
		cursor: pointer;
	}
</style>
