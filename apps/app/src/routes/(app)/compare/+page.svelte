<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Card from '$components/ui/Card.svelte';
	import ConfidenceBadge from '$components/ui/ConfidenceBadge.svelte';
	import Button from '$components/ui/Button.svelte';
	import { calculateWeightedScores } from '$services/scoring';

	let { data } = $props();

	let selectedIds = $state<string[]>(
		$page.url.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
	);

	function toggleProject(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((s) => s !== id);
		} else if (selectedIds.length < 4) {
			selectedIds = [...selectedIds, id];
		}
		// Update URL params
		const params = new URLSearchParams($page.url.searchParams);
		if (selectedIds.length > 0) {
			params.set('ids', selectedIds.join(','));
		} else {
			params.delete('ids');
		}
		goto(`/compare?${params.toString()}`, { replaceState: true, noScroll: true });
	}

	// Calculate winners for each selected project
	const projectResults = $derived(
		data.selectedProjects.map((project: any) => {
			const vendors = project.state?.vendors ?? [];
			const criteria = project.state?.criteria ?? [];
			const weights = project.state?.weights ?? {};
			const scores = project.state?.scores ?? {};
			const rankings = calculateWeightedScores(vendors, criteria, weights, scores);

			return {
				project,
				rankings,
				winner: rankings[0] ?? null,
				vendorCount: vendors.length,
				criteriaCount: criteria.length
			};
		})
	);
</script>

<svelte:head>
	<title>Compare Projects — Shortlist</title>
</svelte:head>

<div class="compare-page">
	<header class="page-header">
		<h1>Compare Projects</h1>
		<p>View vendor evaluation results across multiple projects side by side.</p>
	</header>

	<!-- Project selector -->
	<Card>
		<h3>Select projects to compare (up to 4)</h3>
		<div class="project-selector">
			{#each data.allProjects as project (project.id)}
				<label class="project-chip" class:selected={selectedIds.includes(project.id)}>
					<input
						type="checkbox"
						checked={selectedIds.includes(project.id)}
						onchange={() => toggleProject(project.id)}
						disabled={!selectedIds.includes(project.id) && selectedIds.length >= 4}
					/>
					<span class="chip-name">{project.name}</span>
					<span class="chip-meta">{project.state?.vendors?.length ?? 0} vendors</span>
				</label>
			{/each}
		</div>
	</Card>

	{#if projectResults.length > 0}
		<!-- Comparison grid -->
		<div class="compare-grid" style="grid-template-columns: repeat({projectResults.length}, 1fr)">
			{#each projectResults as result (result.project.id)}
				<Card>
					<div class="compare-card">
						<h3>{result.project.name}</h3>
						<div class="compare-meta">
							<span>{result.vendorCount} vendors</span>
							<span>{result.criteriaCount} criteria</span>
						</div>

						{#if result.winner}
							<div class="winner-section">
								<span class="winner-label">Top Vendor</span>
								<span class="winner-name">{result.winner.vendorName}</span>
								<ConfidenceBadge score={Math.round(result.winner.percentage)} />
							</div>

							<div class="rankings-mini">
								{#each result.rankings as rank, i (rank.vendorId)}
									<div class="mini-rank">
										<span class="rank-pos">#{i + 1}</span>
										<span class="rank-name">{rank.vendorName}</span>
										<div class="rank-bar-container">
											<div
												class="rank-bar"
												style="width: {rank.percentage}%"
											></div>
										</div>
										<span class="rank-score">{rank.totalScore.toFixed(1)}</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="no-results">No scores yet</p>
						{/if}

						<a href="/project/{result.project.id}/results" class="view-link">
							View full results →
						</a>
					</div>
				</Card>
			{/each}
		</div>
	{:else if data.allProjects.length === 0}
		<Card>
			<div class="empty-state">
				<p>No projects to compare. Create some projects first.</p>
				<Button variant="primary" onclick={() => goto('/project/new')}>New Project</Button>
			</div>
		</Card>
	{:else}
		<Card>
			<div class="empty-state">
				<p>Select 2 or more projects above to compare their results.</p>
			</div>
		</Card>
	{/if}
</div>

<style>
	.compare-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		margin-bottom: var(--space-5);
	}

	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin-bottom: 0; }

	h3 { font-size: 1rem; margin-bottom: var(--space-3); }

	.project-selector {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.project-chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all var(--transition-fast);
	}

	.project-chip:hover { border-color: var(--primary-300); }
	.project-chip.selected { border-color: var(--primary-500); background: var(--primary-50); }
	.project-chip input { margin: 0; }

	.chip-name { font-weight: 500; }
	.chip-meta { font-size: 0.75rem; color: var(--neutral-400); }

	.compare-grid {
		display: grid;
		gap: var(--space-4);
		margin-top: var(--space-5);
	}

	.compare-card h3 {
		margin-bottom: var(--space-1);
	}

	.compare-meta {
		display: flex;
		gap: var(--space-3);
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-bottom: var(--space-4);
	}

	.winner-section {
		background: var(--primary-50);
		border-radius: var(--radius-md);
		padding: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.winner-label {
		display: block;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--primary-500);
		font-weight: 600;
		margin-bottom: 2px;
	}

	.winner-name {
		display: block;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--neutral-900);
		margin-bottom: var(--space-1);
	}

	.rankings-mini {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.mini-rank {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.8125rem;
	}

	.rank-pos {
		width: 24px;
		color: var(--neutral-400);
		font-weight: 600;
	}

	.rank-name {
		flex: 1;
		color: var(--neutral-700);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rank-bar-container {
		width: 60px;
		height: 6px;
		background: var(--neutral-100);
		border-radius: 3px;
		overflow: hidden;
	}

	.rank-bar {
		height: 100%;
		background: var(--primary-400);
		border-radius: 3px;
	}

	.rank-score {
		width: 28px;
		text-align: right;
		font-weight: 600;
		color: var(--neutral-600);
	}

	.no-results {
		text-align: center;
		color: var(--neutral-400);
		font-size: 0.875rem;
		padding: var(--space-4) 0;
	}

	.view-link {
		font-size: 0.8125rem;
		color: var(--primary-600);
		font-weight: 500;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-6);
		color: var(--neutral-400);
	}
</style>
