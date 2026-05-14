<script lang="ts">
	// If you want to hydrate a store, you can uncomment these:
	// import { salesData } from '../stores/sales';
	// import { get } from 'svelte/store';
	import { base } from '$app/paths';
	import { getMonthRoute, normalizeMonthSlug } from '$lib/months';
	import type { SaleRecord } from '../types';

	// Get `data.sales` from load()
	export let data: { sales?: SaleRecord[]; user?: { username: string } | null } = {
		sales: [],
		user: null
	};

	// Use the passed-in sales list
	let sales = data.sales ?? [];
	let authStatus = data.user?.username ? `Logged in as ${data.user.username}` : 'No Windows user received';

	function getSaleMonthSlug(sale: SaleRecord) {
		return sale.monthSlug ?? normalizeMonthSlug(sale.month) ?? '';
	}

	// If you prefer to get sales from a store:
	// let sales = get(salesData);
</script>

<div id="container">
	<div class:authenticated={data.user?.username} class="auth-debug">
		Auth test: {authStatus}
	</div>

	<p class="trusteeSalesInfo">
		Trustee sales are held on the first Tuesday of every month outside the northeast lower level
		door of the Williamson County Justice Center at 405 MLK Street, Georgetown, Texas.
		<br />
		State law requires that the notices be posted 21 days before the sale on the steps. The index will
		not be posted before the 20th day. (Texas Property Code Section 51.002(b))
	</p>

	<h1>Trustee Sale Schedules</h1>

	<div class="monthAndMap">
		{#each sales as sale}
			<div class="month">
				<div class="monthLink">
					<a href={`${base}${getMonthRoute(getSaleMonthSlug(sale))}`}>{sale.month}</a>
				</div>
				<div class="date">{sale.date}</div>
				{#if sale.showMap && sale.mapUrl}
					<a href={`${base}/map/${getSaleMonthSlug(sale)}`}>See the Map</a>
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

	h1 {
		text-align: center;
	}

	.auth-debug {
		margin: 1rem 0;
		padding: 0.5rem 0.75rem;
		border: 1px solid #9f1239;
		background: #fff1f2;
		color: #881337;
		font-weight: 700;
	}

	.auth-debug.authenticated {
		border-color: #166534;
		background: #f0fdf4;
		color: #14532d;
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
