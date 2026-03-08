<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const scopeId = $page.params.id;
	let scope = $state<any>(null);
	let saving = $state(false);
	let assessing = $state(false);
	let aiError = $state('');

	let budgetEstimate = $state('');
	let timeline = $state('');
	let stakeholders = $state('');
	let riskAssessment = $state('');
	let readinessScore = $state<number | null>(null);
	let readinessLevel = $state('');
	let gaps = $state<any[]>([]);
	let strengths = $state<string[]>([]);

	const timelineOptions = [
		'Less than 1 month', '1-3 months', '3-6 months',
		'6-12 months', 'More than 12 months'
	];

	onMount(async () => {
		const res = await fetch(`/api/scopes/${scopeId}`);
		if (res.ok) {
			scope = await res.json();
			const p = scope.data?.prepare;
			if (p) {
				budgetEstimate = p.budgetEstimate ? String(p.budgetEstimate) : '';
				timeline = p.timeline ?? '';
				stakeholders = p.stakeholders ?? '';
				riskAssessment = p.riskAssessment ?? '';
				readinessScore = p.readinessScore ?? null;
				gaps = p.gaps ?? [];
			}
		}
	});

	async function runReadinessCheck() {
		assessing = true;
		aiError = '';
		try {
			const signal = scope?.data?.signal ?? {};
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_readiness_assess',
					depth: 'quick',
					scopeId,
					context: {
						selectedApproach: scope?.decision ?? scope?.data?.options?.selectedApproach,
						budgetEstimate, timeline, stakeholders, riskAssessment,
						trigger: signal.trigger,
					},
				}),
			});
			if (res.ok) {
				const data = await res.json();
				const result = data.result ?? data.data ?? {};
				readinessScore = result.score ?? null;
				readinessLevel = result.level ?? '';
				gaps = result.gaps ?? [];
				strengths = result.strengths ?? [];
			} else {
				aiError = 'Readiness check failed — try again.';
			}
		} catch {
			aiError = 'Readiness check failed — try again.';
		}
		assessing = false;
	}

	function scoreColor(score: number): string {
		if (score >= 75) return '#00cc96';
		if (score >= 50) return '#fbbf24';
		return '#f87171';
	}

	async function saveAndContinue() {
		saving = true;
		await fetch(`/api/scopes/${scopeId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				data: {
					...scope?.data,
					prepare: {
						budgetEstimate: Number(budgetEstimate) || 0,
						timeline, stakeholders, riskAssessment,
						readinessScore, gaps,
					}
				},
				current_step: 'endorse',
			}),
		});
		goto(`/scope/${scopeId}/endorse`);
	}
</script>

<svelte:head>
	<title>Prepare — SCOPE — Shortlist</title>
</svelte:head>

<div class="step-page">
	<h2>Assess Readiness</h2>
	<p class="step-desc">Are you ready to act? Fill in planning details and run a readiness assessment.</p>

	<div class="form-row">
		<div class="form-group">
			<label for="budget">Budget Estimate ($)</label>
			<input type="number" id="budget" bind:value={budgetEstimate} placeholder="e.g., 50000" />
		</div>
		<div class="form-group">
			<label for="timeline">Timeline</label>
			<select id="timeline" bind:value={timeline}>
				<option value="">Select timeline...</option>
				{#each timelineOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="form-group">
		<label for="stakeholders">Key Stakeholders</label>
		<textarea id="stakeholders" bind:value={stakeholders} rows="2" placeholder="Who needs to be involved? e.g., CISO, VP Engineering, CFO"></textarea>
	</div>

	<div class="form-group">
		<label for="risk">Risk Assessment</label>
		<textarea id="risk" bind:value={riskAssessment} rows="2" placeholder="What are the key risks of this approach?"></textarea>
	</div>

	<div class="ai-section">
		<button class="ai-btn" onclick={runReadinessCheck} disabled={assessing}>
			{#if assessing}
				<span class="spinner"></span> Assessing...
			{:else}
				✦ Run Readiness Check
			{/if}
		</button>
		{#if aiError}
			<div class="ai-error">{aiError}</div>
		{/if}
	</div>

	{#if readinessScore !== null}
		<div class="readiness-result">
			<div class="score-display">
				<div class="score-circle" style="border-color: {scoreColor(readinessScore)}">
					<span class="score-num" style="color: {scoreColor(readinessScore)}">{readinessScore}</span>
					<span class="score-label">/ 100</span>
				</div>
				{#if readinessLevel}
					<span class="readiness-level" style="color: {scoreColor(readinessScore)}">{readinessLevel.replace('_', ' ')}</span>
				{/if}
			</div>

			{#if strengths.length > 0}
				<div class="strengths">
					<span class="section-label good">Strengths</span>
					{#each strengths as s}
						<span class="strength-item">✓ {s}</span>
					{/each}
				</div>
			{/if}

			{#if gaps.length > 0}
				<div class="gaps-list">
					<span class="section-label bad">Gaps & Blockers</span>
					{#each gaps as gap, i (gap.area ?? `gap-${i}`)}
						<div class="gap-card">
							<div class="gap-header">
								<span class="gap-title">{gap.title}</span>
								<span class="gap-severity" class:high={gap.severity === 'high'} class:medium={gap.severity === 'medium'}>{gap.severity}</span>
							</div>
							<p class="gap-detail">{gap.detail}</p>
							{#if gap.action}
								<span class="gap-action">→ {gap.action}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="step-actions">
		<a href="/scope/{scopeId}/options" class="btn-ghost">← Back</a>
		<button class="btn-primary" onclick={saveAndContinue} disabled={saving}>
			{saving ? 'Saving...' : 'Continue to Endorse →'}
		</button>
	</div>
</div>

<style>
	.step-page h2 { color: var(--text, #e2e8f0); margin-bottom: 0.25rem; }
	.step-desc { color: var(--text-muted, #94a3b8); font-size: 0.875rem; margin-bottom: 1.5rem; }

	.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.form-group { margin-bottom: 1.25rem; }
	.form-group label {
		display: block; font-size: 0.8125rem; font-weight: 600;
		color: var(--text, #e2e8f0); margin-bottom: 0.4rem;
	}
	input[type="number"], select, textarea {
		width: 100%; padding: 0.65rem 0.85rem;
		background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px; color: var(--text, #e2e8f0); font-size: 0.875rem; font-family: inherit;
	}
	textarea { resize: vertical; }
	input:focus, select:focus, textarea:focus {
		outline: none; border-color: #00cc96; box-shadow: 0 0 0 2px rgba(0, 204, 150, 0.15);
	}
	input::placeholder, textarea::placeholder { color: rgba(255, 255, 255, 0.25); }
	select { cursor: pointer; }

	.ai-section { margin-bottom: 1.5rem; }
	.ai-btn {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.6rem 1.25rem; background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25); border-radius: 8px;
		color: #00cc96; font-size: 0.8125rem; font-weight: 600; cursor: pointer; width: 100%;
	}
	.ai-btn:hover { background: rgba(0, 204, 150, 0.15); }
	.ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.spinner {
		width: 14px; height: 14px; border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: #00cc96; border-radius: 50%; animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.ai-error {
		margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}

	.readiness-result {
		padding: 1.25rem; background: rgba(0, 0, 0, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; margin-bottom: 1.5rem;
	}
	.score-display { text-align: center; margin-bottom: 1rem; }
	.score-circle {
		width: 80px; height: 80px; border-radius: 50%;
		border: 3px solid; display: flex; flex-direction: column;
		align-items: center; justify-content: center; margin: 0 auto 0.5rem;
	}
	.score-num { font-size: 1.5rem; font-weight: 800; line-height: 1; }
	.score-label { font-size: 0.6rem; color: var(--text-muted, #64748b); }
	.readiness-level { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }

	.section-label {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.08em; display: block; margin-bottom: 0.35rem;
	}
	.section-label.good { color: #00cc96; }
	.section-label.bad { color: #f87171; }

	.strengths { margin-bottom: 1rem; }
	.strength-item { display: block; font-size: 0.8125rem; color: var(--text-muted, #94a3b8); margin-bottom: 0.15rem; }

	.gaps-list { display: flex; flex-direction: column; gap: 0.4rem; }
	.gap-card {
		padding: 0.65rem 0.85rem; background: rgba(239, 68, 68, 0.04);
		border: 1px solid rgba(239, 68, 68, 0.08); border-radius: 8px;
	}
	.gap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; }
	.gap-title { font-weight: 600; font-size: 0.8125rem; color: var(--text, #e2e8f0); }
	.gap-severity {
		font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
		padding: 1px 6px; border-radius: 4px; letter-spacing: 0.04em;
	}
	.gap-severity.high { background: rgba(239, 68, 68, 0.12); color: #f87171; }
	.gap-severity.medium { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
	.gap-detail { font-size: 0.75rem; color: var(--text-muted, #94a3b8); margin: 0 0 0.2rem; }
	.gap-action { font-size: 0.7rem; color: #00cc96; font-weight: 500; }

	.step-actions {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.btn-ghost { background: none; border: none; color: var(--text-muted, #94a3b8); font-size: 0.875rem; cursor: pointer; text-decoration: none; }
	.btn-ghost:hover { color: var(--text, #e2e8f0); text-decoration: none; }
	.btn-primary {
		padding: 0.6rem 1.5rem; background: #00cc96; color: #0a0f1e;
		border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;
	}
	.btn-primary:hover { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

	@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
</style>
