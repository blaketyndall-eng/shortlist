<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		onclose?: () => void;
		onClose?: () => void;
		children: Snippet;
	}

	let { open = $bindable(true), title, onclose, onClose, children }: Props = $props();
	const handleClose = () => { onclose?.(); onClose?.(); };

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) handleClose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label={title ?? 'Dialog'}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="modal-content">
			{#if title}
				<div class="modal-header">
					<h2>{title}</h2>
					<button class="modal-close" onclick={handleClose} aria-label="Close dialog">✕</button>
				</div>
			{/if}

			<div class="modal-body">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--z-modal);
		padding: var(--space-4);
	}

	.modal-content {
		background: white;
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 520px;
		max-height: 85vh;
		overflow-y: auto;
		box-shadow: var(--shadow-xl);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--neutral-200);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.125rem;
		color: var(--neutral-400);
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
	}

	.modal-close:hover {
		color: var(--neutral-700);
	}

	.modal-body {
		padding: var(--space-5);
	}
</style>
