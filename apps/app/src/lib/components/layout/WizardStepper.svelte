<script lang="ts">
	interface Step {
		key: string;
		label: string;
		href: string;
	}

	interface PhaseGroup {
		phase: 'define' | 'evaluate';
		label: string;
		steps: Step[];
	}

	interface Props {
		steps?: Step[];
		phases?: PhaseGroup[];
		currentStep: string;
		currentPhase?: 'define' | 'evaluate' | 'complete';
		completedSteps?: string[];
	}

	let { steps, phases, currentStep, currentPhase = 'define', completedSteps = [] }: Props = $props();

	const allSteps = $derived(
		phases ? phases.flatMap((p) => p.steps) : (steps ?? [])
	);

	const currentIndex = $derived(allSteps.findIndex((s) => s.key === currentStep));

	function stepStatus(step: Step, index: number): 'completed' | 'current' | 'upcoming' {
		if (completedSteps.includes(step.key)) return 'completed';
		if (index < currentIndex) return 'completed';
		if (index === currentIndex) return 'current';
		return 'upcoming';
	}

	function isPhaseActive(phase: string): boolean {
		return phase === currentPhase;
	}

	function isPhaseComplete(phase: string): boolean {
		if (phase === 'define' && (currentPhase === 'evaluate' || currentPhase === 'complete')) return true;
		if (phase === 'evaluate' && currentPhase === 'complete') return true;
		return false;
	}
</script>

<nav class="stepper" aria-label="Project wizard steps">
	{#if phases}
		<div class="phase-groups">
			{#each phases as phaseGroup, pi}
				<div
					class="phase-group"
					class:active={isPhaseActive(phaseGroup.phase)}
					class:complete={isPhaseComplete(phaseGroup.phase)}
				>
					<div class="phase-label">
						<span class="phase-indicator">
							{#if isPhaseComplete(phaseGroup.phase)}
								✓
							{:else}
								{pi + 1}
							{/if}
						</span>
						<span class="phase-name">{phaseGroup.label}</span>
					</div>

					{#if isPhaseActive(phaseGroup.phase)}
						<ol class="phase-steps">
							{#each phaseGroup.steps as step, i}
								{@const globalIdx = phases.slice(0, pi).reduce((sum, p) => sum + p.steps.length, 0) + i}
								{@const status = stepStatus(step, globalIdx)}
								<li class="step" class:completed={status === 'completed'} class:current={status === 'current'}>
									<a
										href={step.href}
										class="step-link"
										aria-current={status === 'current' ? 'step' : undefined}
									>
										<span class="step-dot">
											{#if status === 'completed'}✓{/if}
										</span>
										<span class="step-label">{step.label}</span>
									</a>
									{#if i < phaseGroup.steps.length - 1}
										<span class="step-connector" class:active={status === 'completed'}></span>
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
				</div>

				{#if pi < phases.length - 1}
					<span class="phase-connector" class:active={isPhaseComplete(phaseGroup.phase)}></span>
				{/if}
			{/each}
		</div>
	{:else}
		<ol>
			{#each allSteps as step, i}
				{@const status = stepStatus(step, i)}
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
					{#if i < allSteps.length - 1}
						<span class="step-connector" class:active={status === 'completed'}></span>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
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

	/* ─── Dual-phase mode ─────────── */

	.phase-groups {
		display: flex;
		align-items: flex-start;
		gap: 0;
	}

	.phase-group {
		flex: 0 0 auto;
	}

	.phase-group.active {
		flex: 1 1 auto;
	}

	.phase-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.phase-indicator {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		font-weight: 700;
		background: var(--neutral-200);
		color: var(--neutral-500);
		flex-shrink: 0;
		transition: all var(--transition-fast);
	}

	.phase-group.active .phase-indicator {
		background: var(--primary-600);
		color: white;
	}

	.phase-group.complete .phase-indicator {
		background: var(--primary-100);
		color: var(--primary-700);
	}

	.phase-name {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--neutral-400);
	}

	.phase-group.active .phase-name {
		color: var(--primary-700);
	}

	.phase-group.complete .phase-name {
		color: var(--neutral-600);
	}

	.phase-steps {
		display: flex;
		align-items: center;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.phase-steps .step-link {
		gap: var(--space-1);
		padding: 2px var(--space-2);
	}

	.step-dot {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.625rem;
		font-weight: 600;
		flex-shrink: 0;
		background: var(--neutral-200);
		color: var(--neutral-500);
		transition: all var(--transition-fast);
	}

	.step.current .step-dot {
		background: var(--primary-600);
		color: white;
	}

	.step.completed .step-dot {
		background: var(--primary-100);
		color: var(--primary-700);
	}

	.phase-connector {
		width: 32px;
		height: 2px;
		background: var(--neutral-200);
		margin: 12px var(--space-2) 0;
		flex-shrink: 0;
	}

	.phase-connector.active {
		background: var(--primary-300);
	}

	@media (max-width: 768px) {
		.step-label {
			display: none;
		}

		.phase-name {
			display: none;
		}
	}
</style>
