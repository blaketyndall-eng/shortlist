<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import ConfidenceBadge from '$components/ui/ConfidenceBadge.svelte';
	import { page } from '$app/stores';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();

	const vendorIdx = parseInt($page.params.vendorIdx ?? '0');
	const vendor = $derived(data.project?.state?.vendors?.[vendorIdx] ?? null);
	const criteria = $derived(data.project?.state?.criteria ?? []);

	// Find scores for this vendor
	const vendorScores = $derived(
		data.project?.state?.scores?.[vendorIdx] ?? {}
	);

	// AI analysis state
	let aiLoading = $state(false);
	let aiAnalysis = $state<{
		strengths: string[];
		weaknesses: string[];
		recommendation: string;
		confidence: number;
	} | null>(null);

	async function runAIAnalysis() {
		if (!vendor) return;
		aiLoading = true;

		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'evaluate',
					depth: 'standard',
					projectId: data.project?.id,
					task: 'vendor_analysis',
					context: {
						vendor,
						criteria,
						scores: vendorScores,
						projectName: data.project?.name,
						category: data.project?.category
					}
				})
			});

			if (res.ok) {
				const result = await res.json();
				aiAnalysis = result.data ?? result;
			}
		} catch {
			// Silently fail — AI is optional
		} finally {
			aiLoading = false;
		}
	}

	// Notes state
	let notes = $state(vendor?.notes ?? '');
	let savingNotes = $state(false);

	async function saveNotes() {
		savingNotes = true;
		const vendors = [...(data.project?.state?.vendors ?? [])];
		if (vendors[vendorIdx]) {
			vendors[vendorIdx] = { ...vendors[vendorIdx], notes };
		}

		await supabase
			.from('projects')
			.update({
				state: { ...data.project?.state, vendors }
			})
			.eq('id', data.project?.id);

		savingNotes = false;
	}

	// Calculate average score
	const avgScore = $derived(() => {
		const values = Object.values(vendorScores) as number[];
		if (values.length === 0) return 0;
		return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
	});
</script>

<svelte:head>
	<title>{vendor?.name ?? 'Vendor'} — Shortlist</title>
</svelte:head>

{#if vendor}
	<div class="vendor-detail">
		<header class="vendor-header">
			<div class="vendor-title">
				<a href="/project/{data.project?.id}/ratings" class="back-link">← Back to Ratings</a>
				<h1>{vendor.name}</h1>
				{#if vendor.website}
					<a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener" class="vendor-website">
						{vendor.website} ↗
					</a>
				{/if}
			</div>
			<div class="vendor-score">
				<span class="score-value">{avgScore()}</span>
				<span class="score-label">Avg Score</span>
			</div>
		</header>

		<div class="detail-grid">
			<div class="main-col">
				<Card>
					<h2>Score Breakdown</h2>
					{#if criteria.length > 0}
						<div class="scores-table">
							{#each criteria as criterion, i (i)}
								{@const score = vendorScores[i] ?? 0}
								<div class="score-row">
									<div class="criterion-info">
										<span class="criterion-name">{criterion.name}</span>
										<span class="criterion-weight">Weight: {criterion.weight}</span>
									</div>
									<div class="score-bar-container">
										<div class="score-bar" style="width: {score * 10}%; background: {score >= 8 ? 'var(--success-500, #22c55e)' : score >= 5 ? 'var(--warning-500, #eab308)' : 'var(--danger-500, #ef4444)'}"></div>
									</div>
									<span class="score-number" class:high={score >= 8} class:mid={score >= 5 && score < 8} class:low={score < 5}>
										{score}/10
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="empty-text">No criteria defined yet.</p>
					{/if}
				</Card>

				<Card>
					<div class="section-header">
						<h2>AI Analysis</h2>
						<Button variant="secondary" size="sm" onclick={runAIAnalysis} loading={aiLoading}>
							{aiAnalysis ? 'Re-analyze' : 'Run Analysis'}
						</Button>
					</div>

					{#if aiAnalysis}
						<div class="ai-results">
							<div class="ai-section">
								<h4>Strengths</h4>
								<ul>
									{#each aiAnalysis.strengths ?? [] as s}
										<li>{s}</li>
									{/each}
								</ul>
							</div>
							<div class="ai-section">
								<h4>Weaknesses</h4>
								<ul>
									{#each aiAnalysis.weaknesses ?? [] as w}
										<li>{w}</li>
									{/each}
								</ul>
							</div>
							<div class="ai-section">
								<h4>Recommendation</h4>
								<p>{aiAnalysis.recommendation}</p>
								<ConfidenceBadge score={aiAnalysis.confidence ?? 70} />
							</div>
						</div>
					{:else if !aiLoading}
						<p class="empty-text">Click "Run Analysis" to get AI-powered insights about this vendor.</p>
					{/if}
				</Card>
			</div>

			<div class="side-col">
				<Card>
					<h3>Quick Info</h3>
					<div class="info-grid">
						<div class="info-item">
							<span class="info-label">Category</span>
							<span class="info-value">{data.project?.category ?? '—'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Criteria Scored</span>
							<span class="info-value">{Object.keys(vendorScores).length} / {criteria.length}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Added</span>
							<span class="info-value">{vendor.addedAt ? new Date(vendor.addedAt).toLocaleDateString() : '—'}</span>
						</div>
					</div>
				</Card>

				<Card>
					<h3>Notes</h3>
					<textarea
						class="notes-input"
						bind:value={notes}
						placeholder="Add notes about this vendor..."
						rows="6"
					></textarea>
					<div class="notes-actions">
						<Button variant="secondary" size="sm" onclick={saveNotes} loading={savingNotes}>
							Save Notes
						</Button>
					</div>
				</Card>
			</div>
		</div>
	</div>
{:else}
	<div class="not-found">
		<h2>Vendor not found</h2>
		<a href="/project/{data.project?.id}/setup">Back to project</a>
	</div>
{/if}

<style>
	.vendor-detail {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.vendor-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: var(--space-6);
	}

	.back-link {
		font-size: 0.8125rem;
		color: var(--neutral-400);
		text-decoration: none;
		display: block;
		margin-bottom: var(--space-2);
	}

	.back-link:hover { color: var(--primary-600); }

	.vendor-header h1 { margin-bottom: var(--space-1); }

	.vendor-website {
		font-size: 0.875rem;
		color: var(--primary-600);
		text-decoration: none;
	}

	.vendor-website:hover { text-decoration: underline; }

	.vendor-score {
		text-align: center;
		padding: var(--space-3) var(--space-5);
		background: var(--c2);
		border: 1px solid var(--b);
		border-radius: var(--radius-lg);
	}

	.score-value {
		display: block;
		font-size: 2rem;
		font-weight: 700;
		color: var(--tx);
	}

	.score-label {
		font-size: 0.75rem;
		color: var(--neutral-400);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: var(--space-5);
	}

	@media (max-width: 900px) {
		.detail-grid { grid-template-columns: 1fr; }
	}

	.main-col, .side-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	h2 { font-size: 1rem; margin-bottom: var(--space-4); }
	h3 { font-size: 0.9375rem; margin-bottom: var(--space-3); }

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.section-header h2 { margin-bottom: 0; }

	.scores-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.score-row {
		display: grid;
		grid-template-columns: 1fr 200px 60px;
		align-items: center;
		gap: var(--space-3);
	}

	.criterion-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--tx);
		display: block;
	}

	.criterion-weight {
		font-size: 0.6875rem;
		color: var(--neutral-400);
	}

	.score-bar-container {
		height: 8px;
		background: var(--s2);
		border-radius: 4px;
		overflow: hidden;
	}

	.score-bar {
		height: 100%;
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.score-number {
		font-size: 0.875rem;
		font-weight: 600;
		text-align: right;
	}

	.score-number.high { color: var(--success-600, #16a34a); }
	.score-number.mid { color: var(--warning-600, #ca8a04); }
	.score-number.low { color: var(--danger-600, #dc2626); }

	.ai-results {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.ai-section h4 {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--mu);
		margin-bottom: var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.ai-section ul {
		list-style: disc;
		padding-left: var(--space-4);
		margin: 0;
	}

	.ai-section li {
		font-size: 0.875rem;
		color: var(--tx);
		padding: 2px 0;
	}

	.ai-section p {
		font-size: 0.875rem;
		color: var(--tx);
		line-height: 1.5;
	}

	.info-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.8125rem;
	}

	.info-label { color: var(--mu); }
	.info-value { font-weight: 500; color: var(--tx); }

	.notes-input {
		width: 100%;
		border: 1px solid var(--b);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		font-family: inherit;
		resize: vertical;
		background: var(--s1);
		color: var(--tx);
	}

	.notes-input:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.notes-actions {
		margin-top: var(--space-2);
		display: flex;
		justify-content: flex-end;
	}

	.empty-text {
		color: var(--mu);
		font-size: 0.875rem;
		text-align: center;
		padding: var(--space-3) 0;
	}

	.not-found {
		text-align: center;
		padding: var(--space-10);
		color: var(--neutral-500);
	}

	.not-found a {
		color: var(--primary-600);
	}
</style>
