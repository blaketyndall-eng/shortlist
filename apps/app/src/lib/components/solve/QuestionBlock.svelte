<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		number: number;
		question: string;
		hint?: string;
		children: Snippet;
	}

	let { number, question, hint, children }: Props = $props();
</script>

<div class="question-block">
	<div class="question-header">
		<span class="question-number">{number}</span>
		<h4 class="question-text">{question}</h4>
	</div>
	{#if hint}
		<p class="question-hint">{hint}</p>
	{/if}
	<div class="question-body">
		{@render children()}
	</div>
</div>

<style>
	.question-block {
		margin-bottom: var(--space-6);
	}

	.question-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
	}

	.question-number {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		background: var(--primary-100, rgba(0, 204, 150, 0.12));
		color: var(--primary-700, #00cc96);
		flex-shrink: 0;
	}

	.question-text {
		font-size: 1rem;
		font-weight: 600;
		color: var(--neutral-800);
		margin: 0;
	}

	.question-hint {
		font-size: 0.8125rem;
		color: var(--neutral-500);
		margin: 0 0 var(--space-3) 0;
		padding-left: calc(28px + var(--space-3));
	}

	.question-body {
		padding-left: calc(28px + var(--space-3));
	}
</style>
