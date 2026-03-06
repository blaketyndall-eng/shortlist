<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		loading?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		children,
		disabled,
		...rest
	}: Props = $props();
</script>

<button
	class="btn btn-{variant} btn-{size}"
	disabled={disabled || loading}
	{...rest}
>
	{#if loading}
		<span class="spinner" aria-hidden="true"></span>
	{/if}
	{@render children()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		font-weight: 500;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Sizes */
	.btn-sm { padding: var(--space-1) var(--space-3); font-size: 0.8125rem; }
	.btn-md { padding: var(--space-2) var(--space-4); font-size: 0.9375rem; }
	.btn-lg { padding: var(--space-3) var(--space-6); font-size: 1rem; }

	/* Variants */
	.btn-primary {
		background: var(--primary-600);
		color: white;
	}
	.btn-primary:hover:not(:disabled) { background: var(--primary-700); }

	.btn-secondary {
		background: var(--color-bg-secondary);
		color: var(--neutral-700);
		border-color: var(--neutral-300);
	}
	.btn-secondary:hover:not(:disabled) { background: var(--neutral-50); }

	.btn-ghost {
		background: transparent;
		color: var(--neutral-600);
	}
	.btn-ghost:hover:not(:disabled) { background: var(--neutral-100); }

	.btn-danger {
		background: #dc2626;
		color: white;
	}
	.btn-danger:hover:not(:disabled) { background: #b91c1c; }

	/* Spinner */
	.spinner {
		width: 1em;
		height: 1em;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
