<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		padding?: 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let { padding = 'md', children }: Props = $props();
</script>

<div class="card card-{padding}">
	{@render children()}
</div>

<style>
	.card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
	}

	.card-sm { padding: var(--space-3); }
	.card-md { padding: var(--space-5); }
	.card-lg { padding: var(--space-8); }
</style>
