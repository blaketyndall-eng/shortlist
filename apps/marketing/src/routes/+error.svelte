<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — Shortlist</title>
</svelte:head>

<div class="error-page">
	<div class="error-inner">
		<span class="error-code">{page.status}</span>
		<h1>
			{#if page.status === 404}
				Page not found
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p class="error-desc">
			{#if page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else}
				{page.error?.message || 'An unexpected error occurred.'}
			{/if}
		</p>
		<div class="error-actions">
			<a href="/" class="btn-primary">
				Back to Home
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 8H3m0 0l4 4M3 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</a>
			<a href="/demo" class="btn-ghost">Explore Demo</a>
		</div>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 70vh;
		padding: 48px 24px;
		position: relative;
		z-index: 1;
	}

	.error-inner {
		text-align: center;
		max-width: 480px;
	}

	.error-code {
		display: inline-block;
		font-family: 'Playfair Display', serif;
		font-size: 6rem;
		font-weight: 800;
		background: linear-gradient(135deg, #00cc96 0%, #4a96f8 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1;
		margin-bottom: 16px;
	}

	h1 {
		font-family: 'Figtree', sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0 0 12px;
	}

	.error-desc {
		font-size: 1rem;
		line-height: 1.6;
		color: #8b95a5;
		margin: 0 0 32px;
	}

	.error-actions {
		display: flex;
		gap: 12px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		background: linear-gradient(135deg, #00cc96, #00b386);
		color: white;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9375rem;
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.btn-primary:hover { opacity: 0.9; }

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #c0c8d4;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.9375rem;
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
	}
	.btn-ghost:hover { border-color: rgba(255, 255, 255, 0.2); color: #ffffff; }
</style>
