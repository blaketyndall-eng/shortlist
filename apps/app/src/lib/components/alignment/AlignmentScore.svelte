<script lang="ts">
	import { getAlignmentHealth, ALIGNMENT_COLORS } from '@shortlist/shared-types/alignment';

	interface Props {
		score: number;
		size?: 'sm' | 'md' | 'lg';
		showLabel?: boolean;
	}

	let { score, size = 'md', showLabel = true }: Props = $props();

	const health = $derived(getAlignmentHealth(score));
	const color = $derived(ALIGNMENT_COLORS[health]);
	const label = $derived(
		health === 'strong' ? 'Team Aligned' :
		health === 'moderate' ? 'Mostly Aligned' :
		health === 'weak' ? 'Gaps Detected' :
		'Misaligned'
	);

	const sizes = {
		sm: { ring: 48, stroke: 3, font: '0.75rem', labelFont: '0.5625rem' },
		md: { ring: 72, stroke: 4, font: '1.125rem', labelFont: '0.6875rem' },
		lg: { ring: 100, stroke: 5, font: '1.5rem', labelFont: '0.8125rem' },
	};

	const s = $derived(sizes[size]);
	const radius = $derived((s.ring - s.stroke * 2) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const dashOffset = $derived(circumference - (score / 100) * circumference);
</script>

<div class="alignment-score" class:sm={size === 'sm'} class:lg={size === 'lg'}>
	<svg
		width={s.ring}
		height={s.ring}
		viewBox="0 0 {s.ring} {s.ring}"
		class="score-ring"
	>
		<!-- Background ring -->
		<circle
			cx={s.ring / 2}
			cy={s.ring / 2}
			r={radius}
			fill="none"
			stroke="var(--neutral-700, #333)"
			stroke-width={s.stroke}
		/>
		<!-- Score ring -->
		<circle
			cx={s.ring / 2}
			cy={s.ring / 2}
			r={radius}
			fill="none"
			stroke={color}
			stroke-width={s.stroke}
			stroke-dasharray={circumference}
			stroke-dashoffset={dashOffset}
			stroke-linecap="round"
			transform="rotate(-90 {s.ring / 2} {s.ring / 2})"
			class="progress"
		/>
	</svg>
	<span class="score-value" style="font-size: {s.font}; color: {color}">
		{score}
	</span>
	{#if showLabel}
		<span class="score-label" style="font-size: {s.labelFont}; color: {color}">
			{label}
		</span>
	{/if}
</div>

<style>
	.alignment-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		position: relative;
	}

	.score-ring {
		display: block;
	}

	.progress {
		transition: stroke-dashoffset 0.6s ease;
	}

	.score-value {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-weight: 700;
		font-family: var(--font-sans);
		margin-top: -8px;
	}

	.sm .score-value { margin-top: -4px; }
	.lg .score-value { margin-top: -12px; }

	.score-label {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-top: 2px;
	}
</style>
