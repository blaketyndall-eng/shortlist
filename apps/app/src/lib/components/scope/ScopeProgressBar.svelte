<script lang="ts">
	const STEPS = [
		{ key: 'signal', label: 'S', full: 'Signal' },
		{ key: 'cause', label: 'C', full: 'Cause' },
		{ key: 'options', label: 'O', full: 'Options' },
		{ key: 'prepare', label: 'P', full: 'Prepare' },
		{ key: 'endorse', label: 'E', full: 'Endorse' },
	];

	const STEP_ORDER = ['signal', 'cause', 'options', 'prepare', 'endorse'];

	interface Props {
		currentStep: string;
		completedSteps?: string[];
	}

	let { currentStep, completedSteps = [] }: Props = $props();

	function stepIndex(step: string): number {
		return STEP_ORDER.indexOf(step);
	}

	function isCompleted(step: string): boolean {
		return completedSteps.includes(step) || stepIndex(step) < stepIndex(currentStep);
	}

	function isCurrent(step: string): boolean {
		return step === currentStep;
	}
</script>

<div class="scope-progress">
	{#each STEPS as step, i (step.key)}
		{#if i > 0}
			<div class="step-connector" class:completed={isCompleted(step.key) || isCurrent(step.key)}></div>
		{/if}
		<div
			class="step-node"
			class:completed={isCompleted(step.key)}
			class:current={isCurrent(step.key)}
			class:upcoming={!isCompleted(step.key) && !isCurrent(step.key)}
			title={step.full}
		>
			<span class="step-letter">{step.label}</span>
			<span class="step-label">{step.full}</span>
		</div>
	{/each}
</div>

<style>
	.scope-progress {
		display: flex;
		align-items: center;
		gap: 0;
		padding: 0.75rem 0;
	}

	.step-connector {
		flex: 1;
		height: 2px;
		background: rgba(255, 255, 255, 0.08);
		transition: background 0.3s;
	}

	.step-connector.completed {
		background: #00cc96;
	}

	.step-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		cursor: default;
	}

	.step-letter {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		transition: all 0.3s;
	}

	.step-label {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition: color 0.3s;
	}

	.step-node.completed .step-letter {
		background: rgba(0, 204, 150, 0.15);
		color: #00cc96;
		border: 2px solid #00cc96;
	}
	.step-node.completed .step-label { color: #00cc96; }

	.step-node.current .step-letter {
		background: #00cc96;
		color: #0a0f1e;
		border: 2px solid #00cc96;
		box-shadow: 0 0 12px rgba(0, 204, 150, 0.3);
	}
	.step-node.current .step-label { color: #00cc96; font-weight: 700; }

	.step-node.upcoming .step-letter {
		background: rgba(255, 255, 255, 0.04);
		color: rgba(255, 255, 255, 0.25);
		border: 2px solid rgba(255, 255, 255, 0.08);
	}
	.step-node.upcoming .step-label { color: rgba(255, 255, 255, 0.25); }
</style>
