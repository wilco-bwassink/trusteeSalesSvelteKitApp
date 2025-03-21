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
	<!-- <div class="monthAndMap">
		<div class="month" id="jan">
			<div class="monthLink"><a href="/january">January Notices</a></div>
			<div class="date">1/7/2025</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="feb">
			<div class="monthLink"><a href="/february">February Notices</a></div>
			<div class="date">2/4/2025</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="mar">
			<div class="monthLink"><a href="/march">March Notices</a></div>
			<div class="date">3/4/2025</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="apr">
			<div class="monthLink"><a href="/april">April Notices</a></div>
			<div class="date">4/1/2025</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="may">
			<div class="monthLink"><a href="/may">May Notices</a></div>
			<div class="date">5/7/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="jun">
			<div class="monthLink"><a href="/june">June Notices</a></div>
			<div class="date">6/4/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="jul">
			<div class="monthLink"><a href="/july">July Notices</a></div>
			<div class="date">7/2/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="aug">
			<div class="monthLink"><a href="/august">August Notices</a></div>
			<div class="date">8/6/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="sep">
			<div class="monthLink"><a href="/september">September Notices</a></div>
			<div class="date">9/2/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="oct">
			<div class="monthLink"><a href="/october">October Notices</a></div>
			<div class="date">10/7/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="nov">
			<div class="monthLink"><a href="/november">November Notices</a></div>
			<div class="date">11/4/2024</div>
			<div class="map">See the Map</div>
		</div>
		<div class="month" id="dec">
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
