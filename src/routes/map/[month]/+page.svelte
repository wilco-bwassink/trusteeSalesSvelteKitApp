<script lang="ts">
	import { salesData } from '../../../stores/sales'; // adjust path to point to your store
	import { onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { SaleRecord } from '../../../types';
	import { normalizeMonthSlug } from '$lib/months';

	let sale: SaleRecord | null = null;

	const unsubscribe = salesData.subscribe((value) => {
		const monthParam = normalizeMonthSlug(get(page).params.month);
		sale =
			value.find((item) => normalizeMonthSlug(item.monthSlug ?? item.month) === monthParam) || null;
	});

	onDestroy(unsubscribe);
</script>

{#if sale && sale.showMap && sale.mapUrl}
	<div id="container">
		<h2>Note to Trustee Sale Map Users</h2>
		<p>
			DISCLAIMER NOTICE: The information depicted herein has been derived from third party sources
			provided to Williamson County. Williamson County does not represent or guarantee that
			information provided is a complete listing of all pending foreclosures in Williamson County.
			Users are strongly encouraged to conduct their own research and to rely solely on the results
			of such research and not on the information provided herein.
		</p>
		<div class="button-group">
			<div class="accept"><a href={sale.mapUrl}>Accept</a></div>
			<div class="decline"><a href="https://www.wilcotx.gov/308/Trustee-Sales">Decline</a></div>
		</div>
	</div>
{:else}
	<p>Loading or no visible map link available for this month.</p>
{/if}

<style>
	#container {
		display: flex;
		flex-direction: column;
		align-items: center;

		p {
			text-align: center;
			max-width: 80%;
		}
	}

	.button-group {
		display: flex;
		gap: 1rem;
	}
	.accept {
		padding: 0.5rem 1rem;
		color: var(--wc-main);
		background-color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		border: 2px solid #000;

		a {
			color: var(--wc-main);
			text-decoration: none;
			font-weight: bold;
		}

		a:hover {
			text-decoration: underline;
		}
	}

	.decline {
		padding: 0.5rem 1rem;
		color: var(--wc-purple);
		background-color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		border: 2px solid #000;

		a {
			color: var(--wc-purple);
			text-decoration: none;
			font-weight: bold;
		}

		a:hover {
			text-decoration: underline;
		}
	}
</style>
