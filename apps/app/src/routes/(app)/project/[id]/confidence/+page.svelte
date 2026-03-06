<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	// Multi-factor confidence model (matching prototype)
	interface ConfidenceFactor {
		key: string;
		label: string;
		description: string;
		weight: number;
		score: number; // 0-100
		source: 'auto' | 'manual';
	}

	let factors = $state<ConfidenceFactor[]>([
		{ key: 'evaluation_depth', label: 'Evaluation Depth', description: 'Number of criteria scored and vendors evaluated', weight: 15, score: 0, source: 'auto' },
		{ key: 'score_spread', label: 'Score Differentiation', description: 'Clear separation between winner and runner-up', weight: 15, score: 0, source: 'auto' },
		{ key: 'demo_coverage', label: 'Demo Coverage', description: 'Demos completed with feedback collected', weight: 12, score: 0, source: 'auto' },
		{ key: 'reference_checks', label: 'Reference Checks', description: 'Reference calls completed and documented', weight: 10, score: 0, source: 'auto' },
		{ key: 'stakeholder_alignment', label: 'Stakeholder Alignment', description: 'Agreement among evaluation team members', weight: 12, score: 0, source: 'manual' },
		{ key: 'commercial_clarity', label: 'Commercial Clarity', description: 'TCO calculated, pricing confirmed, contracts reviewed', weight: 12, score: 0, source: 'auto' },
		{ key: 'risk_mitigation', label: 'Risk Mitigation', description: 'Risks identified, mitigated, or accepted', weight: 10, score: 0, source: 'auto' },
		{ key: 'negotiation_position', label: 'Negotiation Position', description: 'Concessions won, deal terms favorable', weight: 8, score: 0, source: 'manual' },
		{ key: 'implementation_readiness', label: 'Implementation Readiness', description: 'Plan in place, timeline agreed, team assigned', weight: 6, score: 0, source: 'manual' }
	]);

	let overallConfidence = $derived(() => {
		let totalWeight = 0;
		let totalScore = 0;
		for (const f of factors) {
			totalWeight += f.weight;
			totalScore += f.score * f.weight;
		}
		return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
	});

	// Auto-calculate from project data
	$effect(() => {
		const proj = projectStore.currentProject;
		if (proj) {
			const state = (proj.state as Record<string, any>) ?? {};
			autoCalculate(state);
		}
	});

	function autoCalculate(state: Record<string, any>) {
		const vendors = state.vendors ?? [];
		const criteria = state.criteria ?? [];
		const demos = state.demoSessions ?? [];
		const risks = state.risks ?? [];

		// Evaluation depth
		const critCount = criteria.length;
		const vendorCount = vendors.length;
		const scoredVendors = vendors.filter((v: any) => Object.keys(v.scores ?? {}).length > 0).length;
		updateFactor('evaluation_depth', Math.min(100, (critCount * 8 + scoredVendors * 15)));

		// Score spread
		if (vendors.length >= 2) {
			const totals = vendors.map((v: any) => {
				let sum = 0;
				for (const c of criteria) { sum += (v.scores?.[c.name] ?? 0) * (c.weight ?? 1); }
				return sum;
			}).sort((a: number, b: number) => b - a);
			const gap = totals.length >= 2 ? ((totals[0] - totals[1]) / Math.max(totals[0], 1)) * 100 : 0;
			updateFactor('score_spread', Math.min(100, Math.round(gap * 5)));
		}

		// Demo coverage
		const completedDemos = demos.filter((d: any) => d.completed).length;
		updateFactor('demo_coverage', vendorCount > 0 ? Math.min(100, Math.round((completedDemos / vendorCount) * 100)) : 0);

		// Reference checks
		const refs = state.references ?? [];
		const completedRefs = refs.filter((r: any) => r.status === 'completed').length;
		updateFactor('reference_checks', vendorCount > 0 ? Math.min(100, Math.round((completedRefs / Math.max(vendorCount, 1)) * 100)) : 0);

		// Commercial clarity
		const tcoData = state.tcoData ?? {};
		const tcoVendors = Object.keys(tcoData).length;
		updateFactor('commercial_clarity', vendorCount > 0 ? Math.min(100, Math.round((tcoVendors / vendorCount) * 100)) : 0);

		// Risk mitigation
		const openRisks = (risks as any[]).filter((r: any) => r.status === 'open').length;
		const totalRisks = (risks as any[]).length;
		updateFactor('risk_mitigation', totalRisks > 0 ? Math.round(((totalRisks - openRisks) / totalRisks) * 100) : 50);
	}

	function updateFactor(key: string, score: number) {
		factors = factors.map((f) => f.key === key && f.source === 'auto' ? { ...f, score: Math.max(0, Math.min(100, score)) } : f);
	}

	function confColor(score: number): string {
		if (score >= 80) return '#00cc96';
		if (score >= 60) return '#4a96f8';
		if (score >= 40) return '#f59e0b';
		return '#ef4444';
	}

	function confLabel(score: number): string {
		if (score >= 80) return 'Ready to Decide';
		if (score >= 60) return 'Almost There';
		if (score >= 40) return 'Needs Work';
		return 'Not Ready';
	}

	async function save() {
		await fetch(`/api/projects/${projectId}/confidence`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ factors })
		});
	}
</script>

<svelte:head>
	<title>Decision Confidence | Shortlist</title>
</svelte:head>

<div class="conf-page">
	<div class="conf-header">
		<div>
			<h1>Decision Confidence</h1>
			<p class="subtitle">Multi-factor assessment of how ready you are to make a vendor selection.</p>
		</div>
	</div>

	<!-- Overall score -->
	<div class="overall-score">
		<div class="score-circle" style="--color: {confColor(overallConfidence())}">
			<span class="score-num">{overallConfidence()}</span>
			<span class="score-pct">%</span>
		</div>
		<div class="score-info">
			<span class="score-label" style="color: {confColor(overallConfidence())}">{confLabel(overallConfidence())}</span>
			<p class="score-desc">Based on {factors.length} factors weighted by importance to your decision process.</p>
		</div>
	</div>

	<!-- Factor breakdown -->
	<div class="factors">
		{#each factors as factor}
			<div class="factor-row">
				<div class="factor-info">
					<span class="factor-label">{factor.label}</span>
					<span class="factor-desc">{factor.description}</span>
					<span class="factor-weight">Weight: {factor.weight}%</span>
				</div>
				<div class="factor-score-area">
					{#if factor.source === 'manual'}
						<input
							type="range"
							min="0"
							max="100"
							bind:value={factor.score}
							class="manual-slider"
							onchange={save}
						/>
					{/if}
					<div class="factor-bar-bg">
						<div
							class="factor-bar"
							style="width: {factor.score}%; background: {confColor(factor.score)}"
						></div>
					</div>
					<span class="factor-val" style="color: {confColor(factor.score)}">{factor.score}%</span>
					{#if factor.source === 'auto'}
						<span class="auto-tag">auto</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Recommendations -->
	<div class="recs">
		<h3>Recommendations</h3>
		{#each factors.filter((f) => f.score < 50).sort((a, b) => a.score - b.score) as factor}
			<div class="rec-item">
				<span class="rec-icon" style="color: {confColor(factor.score)}">⚠</span>
				<span class="rec-text">
					<strong>{factor.label}</strong> is at {factor.score}%.
					{#if factor.key === 'evaluation_depth'}Score more criteria and evaluate more vendors.
					{:else if factor.key === 'score_spread'}Scores are too close — gather more data to differentiate.
					{:else if factor.key === 'demo_coverage'}Schedule remaining demos and collect feedback.
					{:else if factor.key === 'reference_checks'}Complete vendor reference calls.
					{:else if factor.key === 'commercial_clarity'}Fill in TCO data for all vendors.
					{:else if factor.key === 'risk_mitigation'}Address open risks in the risk register.
					{:else}Improve this area before deciding.
					{/if}
				</span>
			</div>
		{/each}
		{#if factors.every((f) => f.score >= 50)}
			<p class="rec-good">All factors are above threshold. You're in a strong position to make a decision.</p>
		{/if}
	</div>
</div>

<style>
	.conf-page { padding: 2rem 1.5rem; max-width: 800px; margin: 0 auto; }
	.conf-header { margin-bottom: 1.5rem; }
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.overall-score {
		display: flex; align-items: center; gap: 1.5rem;
		background: rgba(0, 0, 0, 0.15); border-radius: 12px;
		padding: 1.5rem; margin-bottom: 2rem;
	}
	.score-circle {
		width: 100px; height: 100px; border-radius: 50%;
		border: 4px solid var(--color); display: flex;
		align-items: center; justify-content: center; flex-shrink: 0;
	}
	.score-num {
		font-size: 2.2rem; font-weight: 700;
		font-family: 'Playfair Display', serif; color: var(--text, #e2e8f0);
	}
	.score-pct { font-size: 1rem; color: var(--text-muted, #94a3b8); }
	.score-label {
		font-size: 1.1rem; font-weight: 600;
	}
	.score-desc {
		margin: 0.3rem 0 0; font-size: 0.82rem;
		color: var(--text-muted, #94a3b8); line-height: 1.4;
	}
	.factors { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; }
	.factor-row {
		display: flex; justify-content: space-between; align-items: center;
		gap: 1rem; padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.08); border-radius: 8px;
	}
	.factor-info { flex: 1; }
	.factor-label { display: block; font-size: 0.85rem; color: var(--text, #e2e8f0); font-weight: 600; }
	.factor-desc { display: block; font-size: 0.72rem; color: var(--text-muted, #64748b); margin-top: 0.1rem; }
	.factor-weight { font-size: 0.6rem; color: var(--text-muted, #64748b); }
	.factor-score-area {
		display: flex; align-items: center; gap: 0.5rem; min-width: 200px;
	}
	.manual-slider {
		width: 80px; accent-color: var(--t, #00cc96);
	}
	.factor-bar-bg {
		flex: 1; height: 6px; background: rgba(255, 255, 255, 0.06);
		border-radius: 3px; overflow: hidden; min-width: 80px;
	}
	.factor-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
	.factor-val {
		font-size: 0.85rem; font-weight: 600; min-width: 35px; text-align: right;
		font-family: 'Playfair Display', serif;
	}
	.auto-tag {
		font-size: 0.55rem; text-transform: uppercase; color: var(--text-muted, #64748b);
		background: rgba(255, 255, 255, 0.04); padding: 0.1rem 0.3rem;
		border-radius: 3px; letter-spacing: 0.04em;
	}
	.recs {
		background: rgba(0, 204, 150, 0.04); border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px; padding: 1.25rem;
	}
	.recs h3 { margin: 0 0 0.75rem; font-size: 0.85rem; color: var(--t, #00cc96); }
	.rec-item {
		display: flex; gap: 0.5rem; align-items: flex-start;
		padding: 0.5rem 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.rec-icon { font-size: 0.85rem; flex-shrink: 0; }
	.rec-text { font-size: 0.82rem; color: var(--text, #e2e8f0); line-height: 1.5; }
	.rec-good { margin: 0; font-size: 0.85rem; color: var(--t, #00cc96); }
</style>
