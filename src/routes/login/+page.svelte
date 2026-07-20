<script lang="ts">
	import { enhance } from '$app/forms';

	export let data: { returnTo: string; passwordLoginAvailable: boolean };
	export let form: { message?: string; username?: string; returnTo?: string } | null = null;
</script>

<svelte:head>
	<title>Trustee Sales Sign In</title>
</svelte:head>

<main>
	<section class="login-card">
		<h1>Trustee Sales Sign In</h1>
		<p>Sign in to manage trustee sale schedules and files.</p>

		{#if !data.passwordLoginAvailable}
			<div class="notice" role="status">Password login has not been configured on this server.</div>
		{/if}

		{#if form?.message}
			<div class="error" role="alert">{form.message}</div>
		{/if}

		<form method="POST" use:enhance>
			<input type="hidden" name="returnTo" value={form?.returnTo ?? data.returnTo} />

			<label for="username">Username</label>
			<input
				id="username"
				name="username"
				type="text"
				autocomplete="username"
				value={form?.username ?? ''}
				required
				disabled={!data.passwordLoginAvailable}
			/>

			<label for="password">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				disabled={!data.passwordLoginAvailable}
			/>

			<button type="submit" disabled={!data.passwordLoginAvailable}>Sign in</button>
		</form>
	</section>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		min-height: 70vh;
		padding: 1rem;
	}

	.login-card {
		width: min(100%, 24rem);
		padding: 2rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.08);
	}

	h1 {
		margin-top: 0;
	}

	form {
		display: grid;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	input {
		padding: 0.65rem;
		border: 1px solid #9ca3af;
		border-radius: 0.25rem;
		font: inherit;
	}

	button {
		margin-top: 0.5rem;
		padding: 0.7rem 1rem;
		border: 0;
		border-radius: 0.25rem;
		background: #0e5a8b;
		color: white;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.error,
	.notice {
		padding: 0.75rem;
		border-radius: 0.25rem;
	}

	.error {
		background: #fff1f2;
		color: #881337;
	}

	.notice {
		background: #fffbeb;
		color: #92400e;
	}
</style>
