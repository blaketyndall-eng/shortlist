<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		icon = '📂',
		title = 'Nothing here yet',
		description = '',
		children
	}: {
		icon?: string;
		title?: string;
		description?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="empty-state">
	<span class="empty-icon">{icon}</span>
	<h3 class="empty-title">{title}</h3>
	{#if description}
		<p class="empty-desc">{description}</p>
	{/if}
	{#if children}
		<div class="empty-action">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-8) var(--space-4);
	}

	.empty-icon {
		font-size: 2rem;
		margin-bottom: var(--space-3);
	}

	.empty-title {
		font-size: 1rem;
		color: var(--neutral-700);
		margin-bottom: var(--space-2);
	}

	.empty-desc {
		font-size: 0.875rem;
		color: var(--neutral-400);
		max-width: 360px;
		line-height: 1.5;
		margin-bottom: var(--space-4);
	}
</style>
