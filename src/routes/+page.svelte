<script lang="ts">
	import { salesData } from '../stores/sales';
	import { onDestroy } from 'svelte';
	import type { SaleRecord } from '../types';

	$: sales = $salesData;
	const unsubscribe = salesData.subscribe((value) => (sales = value));
	onDestroy(unsubscribe);
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
	<!--<div class="month" id="dec">
			<div class="monthLink"><a href="/december">December Notices</a></div>
			<div class="date">12/3/2024</div>
			<div class="map">See the Map</div>
		</div>
	</div>-->
	<div class="monthAndMap">
		{#each sales as sale}
			<div class="month">
				<div class="monthLink"><a href={sale.link}>{sale.month}</a></div>
				<div class="date">{sale.date}</div>
				<div class="map">{sale.showMap ? 'See the Map' : 'Coming Soon'}</div>
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

	/* .trusteeSalesInfo {
		text-align: center;
	} */

	.monthAndMap {
		display: flex;
		flex-direction: column;
		justify-content: center;
		/* width: 25vw; */
		width: 40vw;
	}

	/* .month {
		display: flex;
		flex-direction: row;
		gap: 1em;
		justify-content: space-between;
	} */
	.month {
		display: grid;
		/* grid-template-columns: auto auto auto; */
		grid-template-columns: repeat(3, 33% [col-start]);
		flex-direction: row;
		gap: 1em;
		justify-content: space-between;
	}
	.month:nth-child(even) {
		background-color: var(--wc-tan-60);
	}
</style>
