<script lang="ts">
	let { size = 'md', message = '' }: { size?: 'sm' | 'md' | 'lg'; message?: string } = $props();
</script>

<div class="loading" class:sm={size === 'sm'} class:lg={size === 'lg'}>
	<div class="spinner"></div>
	{#if message}
		<span class="loading-text">{message}</span>
	{/if}
</div>

<style>
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-6);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--neutral-200);
		border-top-color: var(--primary-600);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	.sm .spinner { width: 20px; height: 20px; border-width: 2px; }
	.lg .spinner { width: 48px; height: 48px; border-width: 4px; }

	@keyframes spin { to { transform: rotate(360deg); } }

	.loading-text {
		font-size: 0.875rem;
		color: var(--neutral-500);
	}

	.sm .loading-text { font-size: 0.75rem; }
</style>
