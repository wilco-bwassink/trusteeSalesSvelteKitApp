<script lang="ts">
	// If you want to hydrate a store, you can uncomment these:
	// import { salesData } from '../stores/sales';
	// import { get } from 'svelte/store';
	import { base } from '$app/paths';
	import { getMonthRoute, normalizeMonthSlug } from '$lib/months';
	import type { SaleRecord } from '../types';

	// Get `data.sales` from load()
	export let data: {
		sales?: SaleRecord[];
		user?: { username: string; authMethod: 'windows' | 'password' | 'development' } | null;
	} = {
		sales: [],
		user: null
	};

	// Use the passed-in sales list
	let sales = data.sales ?? [];
	let authStatus = data.user?.username
		? `Logged in as ${data.user.username}`
		: 'Not signed in';

	function getSaleMonthSlug(sale: SaleRecord) {
		return sale.monthSlug ?? normalizeMonthSlug(sale.month) ?? '';
	}

	// If you prefer to get sales from a store:
	// let sales = get(salesData);
</script>

<div id="container">
	<div class:authenticated={data.user?.username} class="auth-debug">
		Authentication: {authStatus}
		{#if !data.user}
			— <a href={`${base}/login`}>Staff sign in</a>
		{/if}
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
		<div class="monthTitle">
			<div>Month</div>
			<div>Sale Date</div>
			<div>Link to Map</div>
		</div>
		{#each sales as sale}
			<div class="month">
				<div class="monthLink">
					<a href={`${base}${getMonthRoute(getSaleMonthSlug(sale))}`}>{sale.month}</a>
				</div>
				<div class="date">{sale.date}</div>
				{#if sale.showMap && sale.mapUrl}
					<a class="mapLink" href={`${base}/map/${getSaleMonthSlug(sale)}`}
						>🗺️ See the {sale.month} Map</a
					>
				{:else}
					<span class="comingSoon">Coming Soon</span>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	:root {
		--wc-main: rgba(14, 90, 139, 1);
		--wc-main-60: rgba(60, 93, 128, 0.6);
		--wc-green: rgba(106, 149, 57, 1);
		--wc-green-60: rgba(113, 148, 53, 0.6);
		--wc-light_blue: rgba(131, 182, 209, 1);
		--wc-light_blue-60: rgba(131, 182, 209, 0.6);
		--wc-purple: rgba(102, 76, 109, 1);
		--wc-purple-60: rgba(102, 76, 109, 0.6);
		--wc-tan: rgba(221, 219, 212, 1);
		--wc-tan-60: rgba(221, 219, 212, 0.6);
		--wc-dark-grey: rgba(9, 14, 23, 1);
		--wc-font-sans-serif: font-family: 'Kanit', sans-serif;
		--wc-font-header: font-family: 'Montserrat', sans-serif;
		--wc-body-font-family: var(--wc-font-sans-serif);
		--wc-code-background-dark: rgba(9, 14, 23, 1);
	}
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
		display: grid;
		grid-template-columns: max-content max-content minmax(20ch, max-content);
		width: max-content;
		max-width: calc(100vw - 2rem);
	}

	.month {
		display: contents;
	}
	.monthTitle {
		display: contents;
	}

	.monthTitle > div {
		background-color: var(--wc-main);
		color: #fff;
		text-align: center;
		padding-top: 0.3em;
		padding-bottom: 0.3em;
	}

	.monthTitle > div:first-child {
		border-top-left-radius: 5px;
	}

	.monthTitle > div:last-child {
		border-top-right-radius: 5px;
	}

	.month > * {
		align-self: center;
		margin-top: 0.5em;
	}

	.monthTitle > div,
	.monthLink,
	.date {
		padding-left: 1em;
		padding-right: 1em;
	}
	.mapLink {
		border: 2px solid var(--wc-main);
		border-radius: 5px;
		padding: 0.25em;
		align-self: center;
		min-width: 20ch;
		box-sizing: border-box;
		text-decoration: none;
		text-align: center;
	}
	.mapLink:hover {
		background-color: var(--wc-tan-60);
	}

	.comingSoon {
		border: 2px solid var(--wc-tan);
		border-radius: 5px;
		padding: 0.25em;
		align-self: center;
		min-width: 20ch;
		box-sizing: border-box;
		background-color: var(--wc-tan-60);
		text-align: center;
	}

	/*.month:nth-child(even) {
		background-color: var(--wc-tan-60);
	}*/
</style>
