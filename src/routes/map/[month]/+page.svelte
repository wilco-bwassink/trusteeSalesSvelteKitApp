<script lang="ts">
	import { salesData } from '../../../stores/sales'; // adjust path to point to your store
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { SaleRecord } from '../../../types';

	let sale = null; // let inference work

	const unsubscribe = salesData.subscribe((value) => {
		const monthParam = get(page).params.month;
		sale = value.find((item) => item.month.toLowerCase() === monthParam.toLowerCase()) || null;
	});

	onDestroy(unsubscribe);
</script>

{#if sale}
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
	<p>Loading or no map link available for this month.</p>
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
		background-color: var(--wc-green);
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;

		a {
			color: #fff;
			text-decoration: none;
		}

		a:hover {
			text-decoration: underline;
		}
	}

	.decline {
		padding: 0.5rem 1rem;
		background-color: var(--wc-purple);
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;

		a {
			color: #fff;
			text-decoration: none;
		}

		a:hover {
			text-decoration: underline;
		}
	}
</style>
