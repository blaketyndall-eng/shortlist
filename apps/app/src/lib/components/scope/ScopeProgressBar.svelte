<script lang="ts">
	import type { ScopeStep } from '@shortlist/shared-types';
	import { SCOPE_STEPS, SCOPE_LABELS } from '@shortlist/shared-types';

	let { currentStep, scopeId } = $props<{ currentStep: ScopeStep; scopeId: string }>();

	const currentIndex = $derived(SCOPE_STEPS.indexOf(currentStep));
</script>

<nav class="scope-progress" aria-label="SCOPE workflow progress">
	{#each SCOPE_STEPS as step, i}
		{@const isCompleted = i < currentIndex}
		{@const isCurrent = step === currentStep}
		{@const isClickable = i <= currentIndex}

		{#if i > 0}
			<div class="connector" class:completed={i <= currentIndex}></div>
		{/if}

		{#if isClickable}
			<a
				href="/scope/{scopeId}/{step}"
				class="step"
				class:completed={isCompleted}
				class:current={isCurrent}
				aria-current={isCurrent ? 'step' : undefined}
			>
				<span class="step-dot">
					{#if isCompleted}✓{:else}{step.charAt(0).toUpperCase()}{/if}
				</span>
				<span class="step-label">{SCOPE_LABELS[step]}</span>
			</a>
		{:else}
			<div class="step future">
				<span class="step-dot">{step.charAt(0).toUpperCase()}</span>
				<span class="step-label">{SCOPE_LABELS[step]}</span>
			</div>
		{/if}
	{/each}
</nav>

<style>
	.scope-progress {
		display: flex;
		align-items: center;
		gap: 0;
		padding: var(--space-2) 0;
	}

	.connector {
		flex: 1;
		height: 2px;
		background: var(--neutral-200);
		min-width: 20px;
		transition: background var(--transition-fast);
	}

	.connector.completed {
		background: var(--primary-500, #6366f1);
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-fast);
	}

	a.step:hover {
		text-decoration: none;
	}

	a.step:hover .step-dot {
		transform: scale(1.1);
	}

	.step-dot {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		transition: all var(--transition-fast);
		border: 2px solid var(--neutral-200);
		background: var(--color-bg-secondary, white);
		color: var(--neutral-400);
	}

	.step.completed .step-dot {
		background: var(--primary-500, #6366f1);
		border-color: var(--primary-500, #6366f1);
		color: white;
	}

	.step.current .step-dot {
		border-color: var(--primary-500, #6366f1);
		color: var(--primary-600, #4f46e5);
		background: rgba(99, 102, 241, 0.1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
	}

	.step.future .step-dot {
		opacity: 0.5;
	}

	.step-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--neutral-400);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.step.current .step-label {
		color: var(--primary-600, #4f46e5);
		font-weight: 600;
	}

	.step.completed .step-label {
		color: var(--neutral-600);
	}
</style>
