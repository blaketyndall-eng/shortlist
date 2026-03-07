<script lang="ts">
	import type { AlignmentGap } from '@shortlist/shared-types/alignment';

	interface Props {
		gap: AlignmentGap;
		projectId: string;
	}

	let { gap, projectId }: Props = $props();

	const severityColor = $derived(
		gap.spread > 40 ? '#ef4444' :
		gap.spread > 25 ? '#f5a623' :
		'#4a96f8'
	);
</script>

<div class="gap-card" style="border-left-color: {severityColor}">
	<div class="gap-header">
		<span class="gap-dimension">{gap.dimension.replace(/_/g, ' ')}</span>
		<span class="gap-spread" style="color: {severityColor}">
			{gap.spread}pt spread
		</span>
	</div>
	<div class="gap-roles">
		<span class="role-high">
			<span class="role-arrow">↑</span> {gap.highRole}
		</span>
		<span class="role-low">
			<span class="role-arrow">↓</span> {gap.lowRole}
		</span>
	</div>
	{#if gap.recommendation}
		<p class="gap-recommendation">{gap.recommendation}</p>
	{/if}
</div>

<style>
	.gap-card {
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-left: 3px solid;
		border-radius: var(--radius-md);
	}

	.gap-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.gap-dimension {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: capitalize;
		color: var(--color-text);
	}

	.gap-spread {
		font-size: 0.75rem;
		font-weight: 700;
	}

	.gap-roles {
		display: flex;
		gap: var(--space-4);
		margin-bottom: var(--space-2);
	}

	.role-high, .role-low {
		font-size: 0.75rem;
		text-transform: capitalize;
	}
	.role-high { color: #00cc96; }
	.role-low { color: #ef4444; }
	.role-arrow { font-size: 0.625rem; }

	.gap-recommendation {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}
</style>
