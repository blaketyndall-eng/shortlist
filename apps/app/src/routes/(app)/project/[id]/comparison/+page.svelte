<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	// Criteria with adjustable weights
	let criteria = $state<Array<{ name: string; weight: number; category: string }>>([]);
	let vendors = $state<Array<{ name: string; scores: Record<string, number> }>>([]);
	let showSensitivity = $state(false);
	let highlightWinner = $state(true);
	let scoreExplanations = $state<Record<string, Record<string, string>>>({});
	let loadingExplanations = $state(false);

	// Load from project store
	$effect(() => {
		const proj = projectStore.currentProject;
		if (proj) {
			const state = proj.state as Record<string, any> ?? {};
			criteria = (state.criteria ?? []).map((c: any) => ({
				name: c.name,
				weight: c.weight ?? 5,
				category: c.category ?? 'functional'
			}));
			vendors = (state.vendors ?? []).map((v: any) => ({
				name: v.name,
				scores: v.scores ?? {}
			}));
		}
	});

	// Weighted total for a vendor
	function weightedTotal(vendor: { scores: Record<string, number> }): number {
		let total = 0;
		let maxPossible = 0;
		for (const c of criteria) {
			const score = vendor.scores[c.name] ?? 0;
			total += score * c.weight;
			maxPossible += 10 * c.weight;
		}
		return maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
	}

	// Rank vendors
	let rankedVendors = $derived(
		[...vendors]
			.map((v) => ({ ...v, total: weightedTotal(v) }))
			.sort((a, b) => b.total - a.total)
	);

	let winnerName = $derived(rankedVendors[0]?.name ?? '');

	function scoreColor(score: number): string {
		if (score >= 8) return '#00cc96';
		if (score >= 6) return '#4a96f8';
		if (score >= 4) return '#f59e0b';
		return '#ef4444';
	}

	function totalColor(total: number): string {
		if (total >= 80) return '#00cc96';
		if (total >= 60) return '#4a96f8';
		if (total >= 40) return '#f59e0b';
		return '#ef4444';
	}

	// Sensitivity: recalculate if weight changes
	function adjustWeight(critIdx: number, delta: number) {
		const c = criteria[critIdx];
		c.weight = Math.max(1, Math.min(10, c.weight + delta));
		criteria = [...criteria]; // trigger reactivity
	}

	// AI: Get score explanations
	async function getExplanations() {
		loadingExplanations = true;
		try {
			const scoreData = vendors.map((v) =>
				`${v.name}: ${criteria.map((c) => `${c.name}=${v.scores[c.name] ?? '?'}`).join(', ')}`
			).join('\n');

			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'score_explanation',
					depth: 'deep',
					projectId,
					context: {
						criteriaNames: criteria.map((c) => c.name).join(', '),
						scoreData
					}
				})
			});
			if (res.ok) {
				const data = await res.json();
				scoreExplanations = data.result?.explanations ?? {};
			}
		} catch { /* */ }
		finally { loadingExplanations = false; }
	}

	// Category grouping for display
	const categoryOrder = ['functional', 'technical', 'commercial', 'strategic', 'risk'];
	let groupedCriteria = $derived(
		categoryOrder.map((cat) => ({
			category: cat,
			items: criteria.filter((c) => c.category === cat)
		})).filter((g) => g.items.length > 0)
	);
</script>

<svelte:head>
	<title>Comparison Matrix | Shortlist</title>
</svelte:head>

<div class="comparison-page">
	<div class="comp-header">
		<div>
			<h1>Comparison Matrix</h1>
			<p class="subtitle">Weighted scoring across all criteria. Adjust weights to run sensitivity analysis.</p>
		</div>
		<div class="header-actions">
			<label class="toggle-label">
				<input type="checkbox" bind:checked={highlightWinner} />
				Highlight Winner
			</label>
			<label class="toggle-label">
				<input type="checkbox" bind:checked={showSensitivity} />
				Weight Controls
			</label>
			<button class="ai-btn" disabled={loadingExplanations} onclick={getExplanations}>
				{loadingExplanations ? 'Generating…' : '✦ AI Explanations'}
			</button>
		</div>
	</div>

	{#if vendors.length === 0}
		<div class="empty-state">
			<p>No vendors to compare yet. Add vendors from the Evaluate phase to see the comparison matrix.</p>
		</div>
	{:else}
		<div class="matrix-wrapper">
			<table class="matrix">
				<thead>
					<tr>
						<th class="criteria-col">Criteria</th>
						<th class="weight-col">Wt</th>
						{#each rankedVendors as vendor}
							<th class="vendor-col" class:winner={highlightWinner && vendor.name === winnerName}>
								<span class="vendor-name">{vendor.name}</span>
								<span class="vendor-total" style="color: {totalColor(vendor.total)}">{vendor.total}</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each groupedCriteria as group}
						<tr class="category-row">
							<td colspan={2 + vendors.length} class="cat-label">{group.category}</td>
						</tr>
						{#each group.items as crit, critIdx}
							{@const globalIdx = criteria.indexOf(crit)}
							<tr>
								<td class="crit-name">{crit.name}</td>
								<td class="weight-cell">
									{#if showSensitivity}
										<div class="weight-control">
											<button class="w-btn" onclick={() => adjustWeight(globalIdx, -1)}>−</button>
											<span class="w-val">{crit.weight}</span>
											<button class="w-btn" onclick={() => adjustWeight(globalIdx, 1)}>+</button>
										</div>
									{:else}
										<span class="w-static">{crit.weight}</span>
									{/if}
								</td>
								{#each rankedVendors as vendor}
									{@const score = vendor.scores[crit.name] ?? 0}
									<td
										class="score-cell"
										class:winner-cell={highlightWinner && vendor.name === winnerName}
										title={scoreExplanations[vendor.name]?.[crit.name] ?? ''}
									>
										<div class="score-bar-bg">
											<div class="score-bar" style="width: {score * 10}%; background: {scoreColor(score)}"></div>
										</div>
										<span class="score-num" style="color: {scoreColor(score)}">{score}</span>
									</td>
								{/each}
							</tr>
						{/each}
					{/each}
				</tbody>
				<tfoot>
					<tr class="total-row">
						<td class="crit-name total-label">Weighted Total</td>
						<td></td>
						{#each rankedVendors as vendor}
							<td class="total-cell" class:winner-cell={highlightWinner && vendor.name === winnerName}>
								<span class="total-num" style="color: {totalColor(vendor.total)}">{vendor.total}</span>
								<span class="total-out">/100</span>
							</td>
						{/each}
					</tr>
				</tfoot>
			</table>
		</div>

		<!-- Score explanations panel -->
		{#if Object.keys(scoreExplanations).length > 0}
			<div class="explanations-panel">
				<h3>✦ AI Score Explanations</h3>
				{#each rankedVendors as vendor}
					{#if scoreExplanations[vendor.name]}
						<div class="expl-vendor">
							<h4>{vendor.name}</h4>
							{#each Object.entries(scoreExplanations[vendor.name]) as [crit, expl]}
								<div class="expl-row">
									<span class="expl-crit">{crit}</span>
									<span class="expl-text">{expl}</span>
								</div>
							{/each}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.comparison-page { padding: 2rem 1.5rem; max-width: 1200px; margin: 0 auto; }
	.comp-header {
		display: flex; justify-content: space-between; align-items: flex-start;
		margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
	}
	h1 {
		font-family: 'Playfair Display', serif; font-size: 1.8rem;
		color: var(--text, #e2e8f0); margin: 0;
	}
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.header-actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
	.toggle-label {
		display: flex; align-items: center; gap: 0.4rem;
		font-size: 0.78rem; color: var(--text-muted, #94a3b8); cursor: pointer;
	}
	.toggle-label input { accent-color: var(--t, #00cc96); }
	.ai-btn {
		padding: 0.4rem 0.85rem; background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2); border-radius: 6px;
		color: var(--t, #00cc96); font-size: 0.78rem; cursor: pointer;
	}
	.ai-btn:disabled { opacity: 0.5; }
	.empty-state {
		padding: 3rem; text-align: center; color: var(--text-muted, #64748b);
		background: rgba(255, 255, 255, 0.02); border-radius: 12px;
		border: 1px dashed rgba(255, 255, 255, 0.08);
	}
	.matrix-wrapper { overflow-x: auto; }
	.matrix {
		width: 100%; border-collapse: separate; border-spacing: 0;
		font-size: 0.82rem;
	}
	.matrix th {
		padding: 0.75rem 0.6rem; text-align: center;
		background: rgba(0, 0, 0, 0.2); color: var(--text-muted, #94a3b8);
		font-weight: 600; font-size: 0.72rem; text-transform: uppercase;
		letter-spacing: 0.04em; position: sticky; top: 0; z-index: 2;
	}
	.criteria-col { text-align: left !important; min-width: 180px; }
	.weight-col { width: 60px; }
	.vendor-col { min-width: 120px; }
	.vendor-col.winner { background: rgba(0, 204, 150, 0.08); }
	.vendor-name { display: block; font-size: 0.78rem; color: var(--text, #e2e8f0); }
	.vendor-total {
		display: block; font-size: 1.1rem; font-weight: 700;
		font-family: 'Playfair Display', serif; margin-top: 0.2rem;
	}
	.category-row td {
		padding: 0.5rem 0.6rem; font-size: 0.65rem; text-transform: uppercase;
		letter-spacing: 0.06em; color: var(--text-muted, #64748b);
		font-weight: 700; background: rgba(255, 255, 255, 0.02);
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}
	.cat-label { padding-left: 0.6rem !important; }
	.matrix td {
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.crit-name {
		color: var(--text, #e2e8f0); font-weight: 500;
		text-align: left; white-space: nowrap;
	}
	.weight-cell { text-align: center; }
	.w-static { color: var(--text-muted, #64748b); font-size: 0.75rem; }
	.weight-control {
		display: flex; align-items: center; justify-content: center; gap: 0.3rem;
	}
	.w-btn {
		width: 20px; height: 20px; padding: 0;
		background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px; color: var(--text-muted, #94a3b8);
		font-size: 0.8rem; cursor: pointer; display: flex;
		align-items: center; justify-content: center;
	}
	.w-btn:hover { border-color: var(--t, #00cc96); color: var(--t, #00cc96); }
	.w-val { font-size: 0.78rem; font-weight: 600; color: var(--text, #e2e8f0); min-width: 16px; text-align: center; }
	.score-cell { text-align: center; position: relative; }
	.winner-cell { background: rgba(0, 204, 150, 0.03); }
	.score-bar-bg {
		width: 100%; height: 4px; background: rgba(255, 255, 255, 0.06);
		border-radius: 2px; overflow: hidden; margin-bottom: 0.2rem;
	}
	.score-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }
	.score-num { font-weight: 600; font-size: 0.8rem; }
	.total-row td {
		padding: 0.85rem 0.6rem; border-top: 2px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.15);
	}
	.total-label { font-weight: 700; color: var(--text, #e2e8f0); }
	.total-cell { text-align: center; }
	.total-num {
		font-size: 1.2rem; font-weight: 700;
		font-family: 'Playfair Display', serif;
	}
	.total-out { font-size: 0.7rem; color: var(--text-muted, #64748b); }
	.explanations-panel {
		margin-top: 2rem; background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12); border-radius: 12px; padding: 1.25rem;
	}
	.explanations-panel h3 {
		margin: 0 0 1rem; font-size: 0.9rem; color: var(--t, #00cc96);
	}
	.expl-vendor { margin-bottom: 1.25rem; }
	.expl-vendor h4 {
		margin: 0 0 0.5rem; font-size: 0.85rem; color: var(--text, #e2e8f0);
	}
	.expl-row {
		display: flex; gap: 0.75rem; padding: 0.35rem 0;
		font-size: 0.78rem; border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.expl-crit {
		min-width: 120px; color: var(--text-muted, #94a3b8);
		font-weight: 500; flex-shrink: 0;
	}
	.expl-text { color: var(--text, #e2e8f0); line-height: 1.4; }
</style>
