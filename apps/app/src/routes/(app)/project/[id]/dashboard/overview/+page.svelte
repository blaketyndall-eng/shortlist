<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';

	let { data } = $props();
	const project = data.project;
	const state = project?.state ?? {};
	const solveData = project?.solve_data ?? {};
	const projectId = $derived($page.params.id);

	const vendors = state.vendors ?? [];
	const criteria = state.criteria ?? [];
	const weights = state.weights ?? {};
	const scores = state.scores ?? {};

	// Calculate vendor scores
	function calcWeightedScore(vendor: string): number {
		const vendorScores = scores[vendor] ?? {};
		let total = 0;
		let weightSum = 0;
		for (const crit of criteria) {
			const w = weights[crit] ?? 0;
			const s = vendorScores[crit] ?? 0;
			total += s * w;
			weightSum += w;
		}
		return weightSum > 0 ? total / weightSum : 0;
	}

	const rankedVendors = $derived(
		vendors
			.map((v: string) => ({ name: v, score: calcWeightedScore(v) }))
			.sort((a: { score: number }, b: { score: number }) => b.score - a.score)
	);

	const topVendor = $derived(rankedVendors[0] ?? null);
	const hasScores = $derived(Object.keys(scores).length > 0);

	// Workflow stages
	const defaultStages = [
		{ name: 'Pre-Evaluation', status: 'pending' },
		{ name: 'Demo Planning', status: 'pending' },
		{ name: 'Vendor Demos', status: 'pending' },
		{ name: 'Scoring & Analysis', status: 'pending' },
		{ name: 'Decision Review', status: 'pending' },
		{ name: 'Final Selection', status: 'pending' },
	];
	const stages = solveData.workflowStages ?? defaultStages;

	const completedStages = $derived(stages.filter((s: any) => s.status === 'complete').length);

	// SOLVE context
	const fromSolve = state.aiContext?.fromSolve ?? false;
	const solveCategory = state.aiContext?.category ?? solveData.category?.label ?? '';
	const solveApproach = state.aiContext?.approach ?? solveData.approach ?? '';
</script>

<svelte:head>
	<title>Overview — {project?.name} — Shortlist</title>
</svelte:head>

<div class="overview">
	<!-- Hero / Summary -->
	<div class="eval-hero">
		<div class="hero-meta">
			<span class="meta-item">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
			<span class="meta-sep">·</span>
			<span class="meta-item">{criteria.length} criteria</span>
			{#if solveCategory}
				<span class="meta-sep">·</span>
				<span class="meta-item">{solveCategory}</span>
			{/if}
		</div>
	</div>

	<!-- Top Recommendation (if scores exist) -->
	{#if topVendor && hasScores}
		<Card>
			<div class="winner-banner">
				<div class="winner-label">TOP RECOMMENDATION</div>
				<div class="winner-row">
					<span class="winner-name">{topVendor.name}</span>
					<span class="winner-score">{topVendor.score.toFixed(1)}/10</span>
				</div>
				<div class="winner-bar">
					<div class="winner-fill" style="width: {topVendor.score * 10}%"></div>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Rankings -->
	{#if rankedVendors.length > 0}
		<Card>
			<h3 class="section-label">VENDOR RANKINGS</h3>
			{#if hasScores}
				<div class="ranking-list">
					{#each rankedVendors as vendor, i (vendor.name)}
						<a href="/project/{projectId}/vendor/{i}" class="rank-row">
							<span class="rank-num">#{i + 1}</span>
							<span class="rank-name">{vendor.name}</span>
							<div class="rank-bar-container">
								<div class="rank-bar" style="width: {vendor.score * 10}%"></div>
							</div>
							<span class="rank-score">{vendor.score.toFixed(1)}</span>
						</a>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<p>No scores yet. Start scoring vendors on the criteria page.</p>
					<Button variant="secondary" size="sm" onclick={() => window.location.href = `/project/${projectId}/criteria`}>
						Go to Scoring →
					</Button>
				</div>
			{/if}
		</Card>
	{/if}

	<!-- Criteria Weights -->
	{#if criteria.length > 0}
		<Card>
			<h3 class="section-label">CRITERIA WEIGHTS</h3>
			<div class="criteria-weights">
				{#each criteria as crit}
					<div class="weight-row">
						<span class="weight-name">{crit}</span>
						<div class="weight-bar-container">
							<div class="weight-bar" style="width: {weights[crit] ?? 0}%"></div>
						</div>
						<span class="weight-pct">{weights[crit] ?? 0}%</span>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Workflow Progress -->
	<Card>
		<h3 class="section-label">EVALUATION WORKFLOW</h3>
		<div class="workflow-track">
			{#each stages as stage, i (stage.name)}
				<div class="wf-stage" class:complete={stage.status === 'complete'} class:active={stage.status === 'active'}>
					<div class="wf-dot">{stage.status === 'complete' ? '✓' : i + 1}</div>
					<span class="wf-label">{stage.name}</span>
				</div>
				{#if i < stages.length - 1}
					<div class="wf-line" class:filled={stage.status === 'complete'}></div>
				{/if}
			{/each}
		</div>
		<p class="wf-summary">{completedStages} of {stages.length} stages complete</p>
	</Card>

	<!-- SOLVE Context Banner (if transitioned from SOLVE) -->
	{#if fromSolve}
		<div class="solve-context">
			<div class="solve-context-label">TRANSFERRED FROM DEFINE PHASE</div>
			<p class="solve-context-text">
				This evaluation was initialized from the SOLVE workflow.
				{solveApproach ? `Approach: ${solveApproach}.` : ''}
				Vendors and criteria were automatically derived from your priorities and constraints.
			</p>
		</div>
	{/if}

	<!-- Quick Actions -->
	<div class="quick-actions">
		<Button variant="secondary" size="sm" onclick={() => window.location.href = `/project/${projectId}/criteria`}>
			Score Vendors
		</Button>
		<Button variant="secondary" size="sm" onclick={() => window.location.href = `/project/${projectId}/results`}>
			View Results
		</Button>
		<Button variant="secondary" size="sm" onclick={() => window.location.href = `/project/${projectId}/dashboard/reports`}>
			Generate Reports
		</Button>
	</div>
</div>

<style>
	.overview { display: flex; flex-direction: column; gap: var(--space-4); }

	.eval-hero { margin-bottom: var(--space-1); }
	.hero-meta { display: flex; align-items: center; gap: var(--space-2); font-size: 0.875rem; color: var(--neutral-500); }
	.meta-sep { color: var(--neutral-300); }

	.section-label {
		font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.5px;
		text-transform: uppercase; color: var(--primary-500); margin-bottom: var(--space-3);
	}

	/* Winner banner */
	.winner-banner { text-align: center; }
	.winner-label {
		font-size: 0.625rem; font-weight: 700; letter-spacing: 1.5px;
		color: var(--primary-500); margin-bottom: var(--space-2);
	}
	.winner-row {
		display: flex; align-items: baseline; justify-content: center;
		gap: var(--space-3); margin-bottom: var(--space-2);
	}
	.winner-name { font-size: 1.25rem; font-weight: 700; color: var(--neutral-900); }
	.winner-score { font-size: 1.25rem; font-weight: 800; color: var(--primary-600); }
	.winner-bar {
		height: 8px; background: var(--neutral-100); border-radius: 4px; overflow: hidden;
		max-width: 300px; margin: 0 auto;
	}
	.winner-fill { height: 100%; background: linear-gradient(90deg, var(--primary-500), #7c3aed); border-radius: 4px; }

	/* Rankings */
	.ranking-list { display: flex; flex-direction: column; gap: var(--space-2); }
	.rank-row {
		display: grid; grid-template-columns: 32px 1fr 120px 40px;
		align-items: center; gap: var(--space-2);
		padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
		text-decoration: none; color: inherit; transition: background 0.1s;
	}
	.rank-row:hover { background: var(--neutral-50); }
	.rank-num { font-size: 0.8125rem; font-weight: 700; color: var(--neutral-400); }
	.rank-name { font-size: 0.9375rem; font-weight: 600; color: var(--neutral-800); }
	.rank-bar-container {
		height: 6px; background: var(--neutral-100); border-radius: 3px; overflow: hidden;
	}
	.rank-bar {
		height: 100%; border-radius: 3px;
		background: linear-gradient(90deg, var(--primary-400), var(--primary-600));
	}
	.rank-score { font-size: 0.875rem; font-weight: 700; color: var(--neutral-700); text-align: right; }

	/* Criteria weights */
	.criteria-weights { display: flex; flex-direction: column; gap: var(--space-2); }
	.weight-row {
		display: grid; grid-template-columns: 1fr 120px 40px;
		align-items: center; gap: var(--space-2); font-size: 0.875rem;
	}
	.weight-name { color: var(--neutral-700); font-weight: 500; }
	.weight-bar-container {
		height: 6px; background: var(--neutral-100); border-radius: 3px; overflow: hidden;
	}
	.weight-bar { height: 100%; background: var(--neutral-400); border-radius: 3px; }
	.weight-pct { font-size: 0.8125rem; font-weight: 600; color: var(--neutral-500); text-align: right; }

	/* Workflow */
	.workflow-track {
		display: flex; align-items: center; gap: 0;
		overflow-x: auto; padding: var(--space-2) 0;
	}
	.wf-stage {
		display: flex; flex-direction: column; align-items: center; gap: var(--space-1);
		flex-shrink: 0; min-width: 80px;
	}
	.wf-dot {
		width: 28px; height: 28px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700;
		background: var(--neutral-100); color: var(--neutral-400);
		border: 2px solid var(--neutral-200);
	}
	.wf-stage.complete .wf-dot {
		background: rgba(0, 204, 150, 0.12); color: #00cc96;
		border-color: rgba(0, 204, 150, 0.3);
	}
	.wf-stage.active .wf-dot {
		background: rgba(74, 150, 248, 0.12); color: #4a96f8;
		border-color: rgba(74, 150, 248, 0.3);
	}
	.wf-label { font-size: 0.6875rem; color: var(--neutral-500); text-align: center; }
	.wf-line {
		flex: 1; height: 2px; background: var(--neutral-200); min-width: 20px;
	}
	.wf-line.filled { background: rgba(0, 204, 150, 0.4); }
	.wf-summary {
		font-size: 0.8125rem; color: var(--neutral-400); margin-top: var(--space-2);
	}

	/* SOLVE context */
	.solve-context {
		padding: var(--space-3) var(--space-4);
		background: rgba(0, 204, 150, 0.04); border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: var(--radius-md);
	}
	.solve-context-label {
		font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px;
		color: #00cc96; margin-bottom: var(--space-1);
	}
	.solve-context-text { font-size: 0.8125rem; color: var(--neutral-500); line-height: 1.6; margin: 0; }

	/* Quick actions */
	.quick-actions {
		display: flex; gap: var(--space-2); flex-wrap: wrap;
	}

	.empty-state {
		text-align: center; padding: var(--space-4);
		color: var(--neutral-500); font-size: 0.875rem;
	}
	.empty-state p { margin-bottom: var(--space-3); }

	@media (max-width: 640px) {
		.rank-row { grid-template-columns: 28px 1fr 40px; }
		.rank-bar-container { display: none; }
	}
</style>
