<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error — Shortlist</title>
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<span class="error-code">{$page.status}</span>
		<h1>
			{#if $page.status === 404}
				Page not found
			{:else if $page.status === 403}
				Access denied
			{:else if $page.status === 500}
				Something went wrong
			{:else}
				An error occurred
			{/if}
		</h1>
		<p class="error-message">
			{#if $page.error?.message}
				{$page.error.message}
			{:else if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else if $page.status === 403}
				You don't have permission to view this page.
			{:else}
				We hit an unexpected error. Please try again.
			{/if}
		</p>
		<div class="error-actions">
			<a href="/dashboard" class="btn-primary">Go to Dashboard</a>
			<button onclick={() => window.location.reload()} class="btn-secondary">Try Again</button>
		</div>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		padding: var(--space-6);
	}

	.error-content {
		text-align: center;
		max-width: 480px;
	}

	.error-code {
		font-size: 4rem;
		font-weight: 800;
		color: var(--neutral-200);
		line-height: 1;
		margin-bottom: var(--space-3);
		display: block;
	}

	h1 {
		font-size: 1.5rem;
		color: var(--neutral-800);
		margin-bottom: var(--space-3);
	}

	.error-message {
		color: var(--neutral-500);
		font-size: 0.9375rem;
		margin-bottom: var(--space-6);
		line-height: 1.6;
	}

	.error-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: center;
	}

	.btn-primary {
		display: inline-block;
		padding: var(--space-2) var(--space-5);
		background: var(--primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
	}

	.btn-primary:hover { background: var(--primary-700); text-decoration: none; }

	.btn-secondary {
		padding: var(--space-2) var(--space-5);
		background: white;
		color: var(--neutral-700);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover { background: var(--neutral-50); }
</style>
