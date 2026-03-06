<script lang="ts">
	import { getConfidenceLevel } from '@shortlist/shared-types/ai';

	interface Props {
		score: number; // 0-100
		showScore?: boolean;
	}

	let { score, showScore = true }: Props = $props();

	const level = $derived(getConfidenceLevel(score));

	const levelConfig: Record<import('@shortlist/shared-types/ai').ConfidenceLevel, { label: string; cssVar: string }> = {
		very_high: { label: 'Very High', cssVar: '--confidence-very-high' },
		high: { label: 'High', cssVar: '--confidence-high' },
		moderate: { label: 'Moderate', cssVar: '--confidence-moderate' },
		low: { label: 'Low', cssVar: '--confidence-low' },
		insufficient: { label: 'Insufficient', cssVar: '--confidence-very-low' }
	};

	const config = $derived(levelConfig[level]);
</script>

<span
	class="confidence-badge"
	style="--badge-color: var({config.cssVar})"
	title="AI Confidence: {score}%"
>
	<span class="badge-dot" aria-hidden="true"></span>
	<span>{config.label}</span>
	{#if showScore}
		<span class="badge-score">{score}%</span>
	{/if}
</span>

<style>
	.confidence-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-2);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--badge-color);
		background: color-mix(in srgb, var(--badge-color) 12%, transparent);
	}

	.badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--badge-color);
	}

	.badge-score {
		opacity: 0.7;
		font-size: 0.6875rem;
	}
</style>
