<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue';
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
		gap: 6px;
		font-weight: 600;
		border-radius: 8px;
		cursor: pointer;
		transition: all 170ms ease;
		white-space: nowrap;
		border: none;
		font-family: var(--font-sans);
	}

	.btn:disabled {
		opacity: 0.3;
		cursor: not-allowed !important;
		transform: none !important;
		box-shadow: none !important;
	}

	/* Sizes */
	.btn-sm { padding: 7px 14px; font-size: 12px; }
	.btn-md { padding: 10px 20px; font-size: 14px; }
	.btn-lg { padding: 11px 28px; font-size: 14px; }

	/* Variants */
	.btn-primary {
		background: var(--t);
		color: #061510;
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--t2);
		transform: translateY(-1px);
		box-shadow: 0 8px 22px rgba(0, 204, 150, 0.22);
	}

	.btn-blue {
		background: var(--bl);
		color: #060e1a;
	}
	.btn-blue:hover:not(:disabled) {
		background: var(--bl2);
		transform: translateY(-1px);
		box-shadow: 0 8px 22px rgba(74, 150, 248, 0.22);
	}

	.btn-secondary {
		background: transparent;
		color: var(--tx);
		border: 1px solid var(--b2);
	}
	.btn-secondary:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.28);
	}

	.btn-ghost {
		background: transparent;
		color: var(--mu);
		border: 1px solid var(--b);
	}
	.btn-ghost:hover:not(:disabled) {
		border-color: var(--b2);
		color: var(--tx);
	}

	.btn-danger {
		background: var(--rd);
		color: white;
	}
	.btn-danger:hover:not(:disabled) {
		background: #d04040;
		transform: translateY(-1px);
		box-shadow: 0 8px 22px rgba(240, 80, 80, 0.22);
	}

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
