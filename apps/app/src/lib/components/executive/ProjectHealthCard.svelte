<script lang="ts">
	import type { ProjectHealthSummary } from '@shortlist/shared-types/executive';
	import AlignmentScore from '$lib/components/alignment/AlignmentScore.svelte';

	interface Props {
		project: ProjectHealthSummary;
	}

	let { project }: Props = $props();

	const stageLabels: Record<string, string> = {
		setup: 'Setup',
		triggers: 'Triggers',
		category: 'Category',
		discovery: 'Discovery',
		constraints: 'Constraints',
		priorities: 'Priorities',
		brief: 'Brief',
		challenges: 'Challenges',
	};

	const riskColors: Record<string, string> = {
		low: 'var(--color-primary)',
		medium: '#f59e0b',
		high: '#ef4444',
	};

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		return `${days}d ago`;
	};
</script>

<a href="/project/{project.id}" class="health-card">
	<div class="card-header">
		<h3 class="project-name">{project.name}</h3>
		<span class="risk-badge" style="background: {riskColors[project.riskLevel]}20; color: {riskColors[project.riskLevel]}">
			{project.riskLevel}
		</span>
	</div>

	<div class="card-body">
		<div class="score-section">
			<AlignmentScore score={project.alignmentScore} size="sm" showLabel={false} />
		</div>

		<div class="details">
			<div class="detail-row">
				<span class="detail-label">Stage</span>
				<span class="detail-value">{stageLabels[project.currentStage] ?? project.currentStage}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Vendors</span>
				<span class="detail-value">{project.vendorCount}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Activity</span>
				<span class="detail-value">{timeAgo(project.lastActivity)}</span>
			</div>
		</div>
	</div>
</a>

<style>
	.health-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 16px;
		text-decoration: none;
		color: inherit;
		transition: border-color var(--transition-fast), transform var(--transition-fast);
		display: block;
	}

	.health-card:hover {
		border-color: var(--color-primary);
		transform: translateY(-1px);
		text-decoration: none;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.project-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-heading);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.risk-badge {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.card-body {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.score-section {
		flex-shrink: 0;
	}

	.details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
	}

	.detail-label {
		color: var(--color-text-secondary);
	}

	.detail-value {
		color: var(--color-text);
		font-weight: 500;
	}
</style>
