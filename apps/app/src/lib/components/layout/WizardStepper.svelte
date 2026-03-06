<script lang="ts">
	interface Step {
		key: string;
		label: string;
		href: string;
	}

	interface Props {
		steps: Step[];
		currentStep: string;
	}

	let { steps, currentStep }: Props = $props();

	const currentIndex = $derived(steps.findIndex((s) => s.key === currentStep));

	function stepStatus(index: number): 'completed' | 'current' | 'upcoming' {
		if (index < currentIndex) return 'completed';
		if (index === currentIndex) return 'current';
		return 'upcoming';
	}
</script>

<nav class="stepper" aria-label="Project wizard steps">
	<ol>
		{#each steps as step, i}
			{@const status = stepStatus(i)}
			<li class="step" class:completed={status === 'completed'} class:current={status === 'current'}>
				<a
					href={step.href}
					class="step-link"
					aria-current={status === 'current' ? 'step' : undefined}
				>
					<span class="step-number">
						{#if status === 'completed'}
							✓
						{:else}
							{i + 1}
						{/if}
					</span>
					<span class="step-label">{step.label}</span>
				</a>
				{#if i < steps.length - 1}
					<span class="step-connector" class:active={status === 'completed'}></span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.stepper ol {
		display: flex;
		align-items: center;
		list-style: none;
		padding: 0;
		margin: 0;
		gap: 0;
	}

	.step {
		display: flex;
		align-items: center;
		flex: 1;
	}

	.step:last-child {
		flex: 0;
	}

	.step-link {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		text-decoration: none;
		white-space: nowrap;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-md);
		transition: background var(--transition-fast);
	}

	.step-link:hover {
		background: var(--neutral-100);
		text-decoration: none;
	}

	.step-number {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
		background: var(--neutral-200);
		color: var(--neutral-500);
		transition: all var(--transition-fast);
	}

	.step.current .step-number {
		background: var(--primary-600);
		color: white;
	}

	.step.completed .step-number {
		background: var(--primary-100);
		color: var(--primary-700);
	}

	.step-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--neutral-500);
	}

	.step.current .step-label {
		color: var(--primary-700);
		font-weight: 600;
	}

	.step.completed .step-label {
		color: var(--neutral-700);
	}

	.step-connector {
		flex: 1;
		height: 2px;
		background: var(--neutral-200);
		margin: 0 var(--space-1);
		min-width: 20px;
	}

	.step-connector.active {
		background: var(--primary-300);
	}

	@media (max-width: 768px) {
		.step-label {
			display: none;
		}
	}
</style>
