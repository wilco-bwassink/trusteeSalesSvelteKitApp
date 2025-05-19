<script>
	// If you want to hydrate a store, you can uncomment these:
	// import { salesData } from '../stores/sales';
	// import { get } from 'svelte/store';

	// Get `data.sales` from load()
	export let data;

	// Use the passed-in sales list
	let sales = data.sales;

	// If you prefer to get sales from a store:
	// let sales = get(salesData);
</script>

<div id="container">
	<p class="trusteeSalesInfo">
		Trustee sales are held on the first Tuesday of every month outside the northeast lower level
		door of the Williamson County Justice Center at 405 MLK Street, Georgetown, Texas.
		<br />
		State law requires that the notices be posted 21 days before the sale on the steps. The index will
		not be posted before the 20th day. (Texas Property Code Section 51.002(b))
	</p>

	<h2>Trustee Sale Schedules</h2>

	<div class="monthAndMap">
		{#each sales as sale}
			<div class="month">
				<div class="monthLink"><a href={sale.link}>{sale.month}</a></div>
				<div class="date">{sale.date}</div>
				{#if sale.showMap && sale.mapUrl}
					<a href={`/map/${sale.month}`}>See the Map</a>
				{:else}
					<span>Coming Soon</span>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	#container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	h2 {
		text-align: center;
	}

	.monthAndMap {
		display: flex;
		flex-direction: column;
		justify-content: center;
		width: 40vw;
	}

	.month {
		display: grid;
		grid-template-columns: repeat(3, 33% [col-start]);
		flex-direction: row;
		gap: 1em;
		justify-content: space-between;
	}

	.month:nth-child(even) {
		background-color: var(--wc-tan-60);
	}
</style>
