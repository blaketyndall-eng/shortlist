<script lang="ts">
	import AlignmentScore from './AlignmentScore.svelte';
	import AlignmentGapCard from './AlignmentGapCard.svelte';
	import type { ProjectAlignmentSummary } from '@shortlist/shared-types/alignment';

	interface Props {
		projectId: string;
	}

	let { projectId }: Props = $props();

	let alignment = $state<ProjectAlignmentSummary | null>(null);
	let polls = $state<any[]>([]);
	let loading = $state(true);

	$effect(() => {
		loadData();
	});

	async function loadData() {
		loading = true;
		try {
			const [alignRes, pollRes] = await Promise.all([
				fetch(`/api/alignment/project/${projectId}`),
				fetch(`/api/alignment/polls?projectId=${projectId}`),
			]);

			if (alignRes.ok) {
				const data = await alignRes.json();
				alignment = data.alignment;
			}
			if (pollRes.ok) {
				const data = await pollRes.json();
				polls = data.polls ?? [];
			}
		} catch (e) {
			console.error('Failed to load alignment data:', e);
		}
		loading = false;
	}
</script>

{#if loading}
	<div class="loading">Loading alignment data...</div>
{:else if alignment}
	<div class="alignment-dashboard">
		<!-- Overall Score -->
		<div class="score-hero">
			<AlignmentScore score={alignment.overallScore} size="lg" />
			<div class="score-stats">
				<div class="stat">
					<span class="stat-value">{alignment.activePolls}</span>
					<span class="stat-label">Active Polls</span>
				</div>
				<div class="stat">
					<span class="stat-value">{alignment.totalResponses}</span>
					<span class="stat-label">Total Responses</span>
				</div>
			</div>
		</div>

		<!-- Role Breakdown -->
		{#if Object.keys(alignment.roleBreakdown).length > 0}
			<div class="section">
				<h3 class="section-title">Alignment by Role</h3>
				<div class="role-bars">
					{#each Object.entries(alignment.roleBreakdown) as [role, score]}
						<div class="role-row">
							<span class="role-label">{role}</span>
							<div class="bar-track">
								<div
									class="bar-fill"
									style="width: {score}%; background: {score >= 80 ? '#00cc96' : score >= 60 ? '#4a96f8' : score >= 40 ? '#f5a623' : '#ef4444'}"
								></div>
							</div>
							<span class="role-score">{score}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Dimension Breakdown -->
		{#if Object.keys(alignment.dimensionBreakdown).length > 0}
			<div class="section">
				<h3 class="section-title">Alignment by Dimension</h3>
				<div class="dimension-grid">
					{#each Object.entries(alignment.dimensionBreakdown) as [dim, score]}
						<div class="dimension-card">
							<span class="dim-label">{dim.replace(/_/g, ' ')}</span>
							<AlignmentScore score={score} size="sm" showLabel={false} />
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Gap Alerts -->
		{#if alignment.gaps.length > 0}
			<div class="section">
				<h3 class="section-title">Alignment Gaps</h3>
				<div class="gaps">
					{#each alignment.gaps as gap}
						<AlignmentGapCard {gap} {projectId} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- Poll History -->
		{#if polls.length > 0}
			<div class="section">
				<h3 class="section-title">Poll History</h3>
				<div class="poll-list">
					{#each polls as p}
						<div class="poll-item">
							<div class="poll-info">
								<span class="poll-title">{p.title}</span>
								<span class="poll-meta">
									{p.context_type?.replace(/_/g, ' ')}
									{#if p.solve_stage} · {p.solve_stage}{/if}
									 · {p.responseCount ?? 0} responses
								</span>
							</div>
							<span class="poll-status" class:closed={p.status === 'closed'}>
								{p.status}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if alignment.lastAnalyzedAt}
			<p class="last-analyzed">
				Last analyzed: {new Date(alignment.lastAnalyzedAt).toLocaleDateString()}
			</p>
		{/if}
	</div>
{:else}
	<div class="empty">
		<h3>No Alignment Data Yet</h3>
		<p>Create alignment polls in the Solve workflow to start tracking team alignment.</p>
	</div>
{/if}

<style>
	.alignment-dashboard {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.score-hero {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-5);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.score-stats { display: flex; gap: var(--space-6); }
	.stat { display: flex; flex-direction: column; align-items: center; }
	.stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-text); }
	.stat-label { font-size: 0.75rem; color: var(--color-text-secondary); }

	.section-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--space-3);
	}

	.role-bars { display: flex; flex-direction: column; gap: var(--space-2); }
	.role-row { display: flex; align-items: center; gap: var(--space-3); }
	.role-label {
		width: 100px;
		font-size: 0.8125rem;
		font-weight: 500;
		text-transform: capitalize;
		color: var(--color-text-secondary);
	}
	.bar-track {
		flex: 1;
		height: 8px;
		background: var(--neutral-700, #333);
		border-radius: 4px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s ease;
	}
	.role-score {
		font-weight: 700;
		font-size: 0.875rem;
		min-width: 32px;
		text-align: right;
	}

	.dimension-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-3);
	}
	.dimension-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.dim-label {
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		color: var(--color-text-secondary);
		text-align: center;
	}

	.gaps { display: flex; flex-direction: column; gap: var(--space-2); }

	.poll-list { display: flex; flex-direction: column; gap: 1px; }
	.poll-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.poll-info { display: flex; flex-direction: column; gap: 2px; }
	.poll-title { font-size: 0.8125rem; font-weight: 500; }
	.poll-meta { font-size: 0.6875rem; color: var(--color-text-secondary); text-transform: capitalize; }
	.poll-status {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #00cc96;
		text-transform: uppercase;
	}
	.poll-status.closed { color: var(--neutral-500); }

	.last-analyzed {
		font-size: 0.75rem;
		color: var(--neutral-500);
		text-align: center;
	}

	.loading, .empty {
		text-align: center;
		padding: var(--space-8);
		color: var(--color-text-secondary);
	}
	.empty h3 { color: var(--color-text); margin-bottom: var(--space-2); }
</style>
