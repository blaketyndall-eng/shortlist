<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import ConfidenceBadge from '$components/ui/ConfidenceBadge.svelte';
	import Button from '$components/ui/Button.svelte';
	import { calculateWeightedScores, type WeightedScore } from '$services/scoring';
	import type { ProjectVendor, Criterion } from '@shortlist/shared-types/project';

	let { data } = $props();

	const vendors: ProjectVendor[] = data.vendors ?? [];
	const criteria: Criterion[] = data.criteria ?? [];
	const weights: Record<string, number> = data.project.state?.weights ?? {};
	const scores: Record<string, Record<string, number>> = data.project.state?.scores ?? {};

	const rankings: WeightedScore[] = $derived(
		calculateWeightedScores(vendors, criteria, weights, scores)
	);

	const winner = $derived(rankings[0]);
	let briefLoading = $state(false);

	function exportCSV() {
		const header = ['Rank', 'Vendor', 'Score', 'Percentage', ...criteria.map(c => c.name)];
		const rows = rankings.map((r, i) => [
			i + 1,
			r.vendorName,
			r.totalScore.toFixed(2),
			r.percentage.toFixed(1) + '%',
			...criteria.map(c => {
				const b = r.breakdown.find(b => b.criterionId === c.id);
				return b?.rawScore ?? 0;
			}),
		]);
		const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data.project.name.replace(/\s+/g, '-')}-results.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function exportJSON() {
		const exportData = {
			project: data.project.name,
			exportedAt: new Date().toISOString(),
			criteria: criteria.map(c => ({ name: c.name, weight: weights[c.id] ?? c.weight, category: c.category })),
			rankings: rankings.map((r, i) => ({
				rank: i + 1,
				vendor: r.vendorName,
				score: r.totalScore,
				percentage: r.percentage,
				breakdown: r.breakdown,
			})),
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data.project.name.replace(/\s+/g, '-')}-results.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function generateExecutiveBrief() {
		briefLoading = true;
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'executive_milestone_brief',
					projectId: data.project.id,
					context: {
						rankings: rankings.slice(0, 5).map((r, i) => ({
							rank: i + 1,
							vendor: r.vendorName,
							score: r.totalScore,
							percentage: r.percentage,
						})),
						criteriaCount: criteria.length,
						vendorCount: vendors.length,
						winner: winner?.vendorName,
						winnerScore: winner?.percentage,
					},
				}),
			});
			if (res.ok) {
				const result = await res.json();
				const briefText = result.data?.summary ?? result.result?.summary ?? 'Brief generated — check executive dashboard.';
				alert(`Executive Brief Generated:\n\n${briefText}`);
			} else {
				alert('Failed to generate executive brief. Please try again.');
			}
		} catch {
			alert('Error generating brief. Please try again.');
		}
		briefLoading = false;
	}

	// Group criteria by category for the breakdown
	const categories = $derived.by(() => {
		const cats = new Map<string, Criterion[]>();
		for (const c of criteria) {
			const existing = cats.get(c.category) ?? [];
			cats.set(c.category, [...existing, c]);
		}
		return cats;
	});
</script>

<svelte:head>
	<title>Results — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-results">
	<h2>Evaluation Results</h2>
	<p class="step-description">
		Weighted scoring comparison across {vendors.length} vendors and {criteria.length} criteria.
	</p>

	<!-- Winner banner -->
	{#if winner && winner.totalScore > 0}
		<div class="winner-banner">
			<div class="winner-label">Recommended</div>
			<div class="winner-info">
				<h3>{winner.vendorName}</h3>
				<span class="winner-score">{winner.percentage.toFixed(1)}% match</span>
			</div>
		</div>
	{/if}

	<!-- Ranking cards -->
	<div class="ranking-grid">
		{#each rankings as rank, i (rank.vendorId)}
			<Card>
				<div class="rank-card">
					<div class="rank-position">
						<span class="rank-num">#{i + 1}</span>
						<div>
							<h3>{rank.vendorName}</h3>
							<ConfidenceBadge score={Math.round(rank.percentage)} />
						</div>
					</div>
					<div class="rank-score">
						<span class="score-big">{rank.totalScore.toFixed(2)}</span>
						<span class="score-max">/ {rank.maxPossible}</span>
					</div>

					<!-- Score breakdown by category -->
					<div class="breakdown">
						{#each rank.breakdown as item (item.criterionId)}
							<div class="breakdown-row">
								<span class="breakdown-name">{item.criterionName}</span>
								<div class="breakdown-bar-container">
									<div
										class="breakdown-bar"
										style="width: {(item.rawScore / 10) * 100}%"
									></div>
								</div>
								<span class="breakdown-val">{item.rawScore}</span>
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/each}
	</div>

	<!-- Comparison table -->
	<Card padding="sm">
		<h3 class="table-heading">Side-by-Side Comparison</h3>
		<div class="comparison-wrapper">
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Criterion</th>
						<th>Weight</th>
						{#each rankings as rank (rank.vendorId)}
							<th>{rank.vendorName}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each criteria as criterion (criterion.id)}
						<tr>
							<td class="criterion-cell">
								<span class="crit-name">{criterion.name}</span>
								<span class="crit-cat">{criterion.category}</span>
							</td>
							<td class="weight-cell">{weights[criterion.id] ?? criterion.weight}</td>
							{#each rankings as rank (rank.vendorId)}
								{@const score = rank.breakdown.find((b) => b.criterionId === criterion.id)?.rawScore ?? 0}
								<td class="score-cell" class:high={score >= 8} class:mid={score >= 5 && score < 8} class:low={score < 5 && score > 0}>
									{score}
								</td>
							{/each}
						</tr>
					{/each}
					<tr class="total-row">
						<td><strong>Weighted Total</strong></td>
						<td></td>
						{#each rankings as rank (rank.vendorId)}
							<td class="total-cell"><strong>{rank.totalScore.toFixed(2)}</strong></td>
						{/each}
					</tr>
				</tbody>
			</table>
		</div>
	</Card>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => history.back()}>
			← Back to Ratings
		</Button>
		<div class="right-actions">
			<Button variant="secondary" onclick={exportCSV}>
				Export CSV
			</Button>
			<Button variant="secondary" onclick={exportJSON}>
				Export JSON
			</Button>
			<Button variant="secondary" onclick={() => {
				const w = window.open(`/api/projects/${data.project.id}/export`, '_blank');
				if (w) setTimeout(() => w.print(), 1000);
			}}>
				Export PDF
			</Button>
			<Button variant="secondary" onclick={generateExecutiveBrief} loading={briefLoading}>
				Executive Brief
			</Button>
			<Button variant="secondary" onclick={() => {
				navigator.clipboard.writeText(window.location.href);
				alert('Link copied to clipboard');
			}}>
				Share Results
			</Button>
		</div>
	</div>
</div>

<style>
	.step-results h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }

	/* Winner banner */
	.winner-banner {
		background: linear-gradient(135deg, var(--primary-50) 0%, #eff6ff 100%);
		border: 1px solid var(--primary-200);
		border-radius: var(--radius-lg);
		padding: var(--space-4) var(--space-5);
		margin-bottom: var(--space-5);
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.winner-label {
		background: var(--primary-600);
		color: white;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px var(--space-2);
		border-radius: var(--radius-sm);
	}

	.winner-info h3 {
		font-size: 1.125rem;
		margin-bottom: 0;
	}

	.winner-score {
		font-size: 0.875rem;
		color: var(--primary-600);
		font-weight: 600;
	}

	/* Rankings */
	.ranking-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.rank-card { }

	.rank-position {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.rank-num {
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--neutral-300);
	}

	.rank-position h3 {
		font-size: 1rem;
		margin-bottom: 2px;
	}

	.rank-score {
		margin-bottom: var(--space-4);
	}

	.score-big {
		font-size: 2rem;
		font-weight: 800;
		color: var(--neutral-900);
	}

	.score-max {
		font-size: 1rem;
		color: var(--neutral-400);
	}

	.breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.breakdown-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.8125rem;
	}

	.breakdown-name {
		flex: 1;
		color: var(--neutral-600);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.breakdown-bar-container {
		width: 80px;
		height: 6px;
		background: var(--neutral-100);
		border-radius: 3px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.breakdown-bar {
		height: 100%;
		background: var(--primary-400);
		border-radius: 3px;
		transition: width var(--transition-normal);
	}

	.breakdown-val {
		width: 20px;
		text-align: right;
		font-weight: 600;
		color: var(--neutral-700);
	}

	/* Comparison table */
	.table-heading {
		padding: var(--space-3) var(--space-4);
		margin-bottom: 0;
		font-size: 1rem;
	}

	.comparison-wrapper {
		overflow-x: auto;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.comparison-table th {
		padding: var(--space-2) var(--space-3);
		text-align: left;
		border-bottom: 2px solid var(--neutral-200);
		font-weight: 600;
		color: var(--neutral-600);
		white-space: nowrap;
	}

	.comparison-table td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--neutral-100);
	}

	.criterion-cell .crit-name {
		display: block;
		font-weight: 500;
		color: var(--neutral-800);
	}

	.criterion-cell .crit-cat {
		font-size: 0.6875rem;
		color: var(--neutral-400);
		text-transform: capitalize;
	}

	.weight-cell {
		color: var(--neutral-500);
		text-align: center;
	}

	.score-cell {
		text-align: center;
		font-weight: 600;
	}

	.score-cell.high { color: #16a34a; }
	.score-cell.mid { color: #ca8a04; }
	.score-cell.low { color: #dc2626; }

	.total-row td {
		border-top: 2px solid var(--neutral-200);
		border-bottom: none;
	}

	.total-cell {
		text-align: center;
		font-size: 0.9375rem;
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-6);
	}

	.right-actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
