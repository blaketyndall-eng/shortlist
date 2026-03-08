<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	const scopeId = $derived($page.params.id);

	let budgetEstimate = $state('');
	let timeline = $state('');
	let stakeholders = $state('');
	let riskAssessment = $state('');
	let readinessScore = $state<number | null>(null);
	let gaps: Array<{ area: string; severity: string; description: string; recommendation: string }> = $state([]);
	let blockers: string[] = $state([]);
	let scopeData = $state<Record<string, any>>({});
	let assessing = $state(false);
	let saving = $state(false);
	let error = $state('');

	const timelineOptions = [
		'1-2 weeks',
		'2-4 weeks',
		'1-2 months',
		'3-6 months',
		'6-12 months',
		'12+ months',
	];

	onMount(async () => {
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) {
				const data = await res.json();
				scopeData = data.scope?.data ?? {};
				if (scopeData.prepare) {
					budgetEstimate = scopeData.prepare.budgetEstimate?.toString() ?? '';
					timeline = scopeData.prepare.timeline ?? '';
					stakeholders = scopeData.prepare.stakeholders ?? '';
					riskAssessment = scopeData.prepare.riskAssessment ?? '';
					readinessScore = scopeData.prepare.readinessScore ?? null;
					gaps = scopeData.prepare.gaps ?? [];
					blockers = scopeData.prepare.blockers ?? [];
				}
			}
		} catch { /* use defaults */ }
	});

	async function runReadinessCheck() {
		assessing = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_readiness_assess',
					depth: 'deep',
					context: {
						signal: scopeData.signal ?? {},
						cause: scopeData.cause ?? {},
						options: scopeData.options ?? {},
						budgetEstimate: parseFloat(budgetEstimate) || 0,
						timeline,
						stakeholders,
						riskAssessment,
					},
				}),
			});

			if (res.ok) {
				const data = await res.json();
				const result = data.result ?? data.data ?? {};
				readinessScore = result.readinessScore ?? null;
				gaps = result.gaps ?? [];
				blockers = result.blockers ?? [];
			} else {
				error = 'Assessment failed — try again';
			}
		} catch {
			error = 'Network error — check your connection and try again';
		} finally {
			assessing = false;
		}
	}

	async function handleSave() {
		saving = true;
		error = '';

		try {
			const getRes = await fetch(`/api/scopes/${scopeId}`);
			if (!getRes.ok) { error = 'Failed to load scope'; saving = false; return; }
			const { scope } = await getRes.json();

			const updatedData = {
				...scope.data,
				prepare: {
					budgetEstimate: parseFloat(budgetEstimate) || 0,
					timeline,
					stakeholders: stakeholders.trim(),
					riskAssessment: riskAssessment.trim(),
					readinessScore,
					gaps,
					blockers,
				},
			};

			const res = await fetch(`/api/scopes/${scopeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					data: updatedData,
					current_step: 'endorse',
				}),
			});

			if (!res.ok) {
				error = 'Failed to save';
				saving = false;
				return;
			}

			goto(`/scope/${scopeId}/endorse`);
		} catch {
			error = 'Network error — check your connection and try again';
			saving = false;
		}
	}

	function scoreColor(score: number): string {
		if (score >= 75) return '#50b080';
		if (score >= 50) return '#f0a030';
		return '#f05050';
	}

	const readinessBlocked = $derived(readinessScore !== null && readinessScore < 50);
	const hasHighSeverityGaps = $derived(gaps.some(g => g.severity === 'high'));
</script>

<svelte:head>
	<title>Prepare — SCOPE</title>
</svelte:head>

<Card>
	<div class="step-content">
		<h2>Are we ready?</h2>
		<p class="step-intro">Budget, timeline, stakeholders, risks — lay the groundwork before seeking endorsement.</p>

		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<label class="field">
			<span>Estimated budget ($)</span>
			<input
				type="number"
				bind:value={budgetEstimate}
				placeholder="e.g., 50000"
				min="0"
				step="1000"
			/>
		</label>

		<label class="field">
			<span>Expected timeline</span>
			<select bind:value={timeline}>
				<option value="">Select timeline…</option>
				{#each timelineOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</label>

		<label class="field">
			<span>Key stakeholders</span>
			<textarea
				bind:value={stakeholders}
				placeholder="Who needs to be involved? Decision makers, budget owners, end users, IT/security…"
				rows="3"
			></textarea>
		</label>

		<label class="field">
			<span>Risk assessment</span>
			<textarea
				bind:value={riskAssessment}
				placeholder="What could go wrong? Migration risks, adoption challenges, vendor lock-in, timeline slippage…"
				rows="3"
			></textarea>
		</label>

		<!-- AI Readiness Assessment -->
		<div class="ai-section">
			<div class="ai-header">
				<h3>Readiness Check</h3>
				<Button
					variant="secondary"
					size="sm"
					loading={assessing}
					onclick={runReadinessCheck}
				>
					{readinessScore !== null ? 'Re-assess' : 'Run Readiness Check'}
				</Button>
			</div>

			{#if readinessScore === null && !assessing}
				<div class="empty-hint">
					<p>Fill in your budget, timeline, stakeholders, and risks above, then click "Run Readiness Check" for an AI assessment of how prepared your organization is to move forward.</p>
				</div>
			{/if}

			{#if readinessScore !== null}
				<div class="readiness-result">
					<div class="score-display">
						<div
							class="score-ring"
							style:border-color={scoreColor(readinessScore)}
						>
							<span class="score-value">{readinessScore}</span>
							<span class="score-label">/ 100</span>
						</div>
						<span
							class="score-verdict"
							style:color={scoreColor(readinessScore)}
						>
							{readinessScore >= 75 ? 'Ready to proceed' : readinessScore >= 50 ? 'Needs attention' : 'Not ready'}
						</span>
					</div>

					{#if gaps.length > 0}
						<div class="gaps-section">
							<h4>Gaps identified</h4>
							{#each gaps as gap}
								<div class="gap-item">
									<div class="gap-header">
										<span class="gap-area">{gap.area}</span>
										<span
											class="gap-severity"
											style:color={gap.severity === 'high' ? '#f05050' : gap.severity === 'medium' ? '#f0a030' : '#50b080'}
										>
											{gap.severity}
										</span>
									</div>
									<p class="gap-desc">{gap.description}</p>
									<p class="gap-rec">→ {gap.recommendation}</p>
								</div>
							{/each}
						</div>
					{/if}

					{#if blockers.length > 0}
						<div class="blockers-section">
							<h4>Blockers</h4>
							{#each blockers as blocker}
								<div class="blocker-item">🚫 {blocker}</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if readinessBlocked}
			<div class="readiness-gate" role="alert">
				<strong>Not ready to proceed</strong>
				<p>Your readiness score is {readinessScore}/100 — below the minimum threshold of 50. Address the gaps above before moving to endorsement.</p>
				{#if hasHighSeverityGaps}
					<p class="gate-detail">You have {gaps.filter(g => g.severity === 'high').length} high-severity gap{gaps.filter(g => g.severity === 'high').length > 1 ? 's' : ''} to resolve.</p>
				{/if}
			</div>
		{/if}

		<div class="actions">
			<Button variant="ghost" type="button" onclick={() => goto(`/scope/${scopeId}/options`)}>
				Back
			</Button>
			<Button variant="primary" loading={saving} onclick={handleSave} disabled={readinessBlocked}>
				{readinessBlocked ? 'Resolve Gaps First' : 'Save & Continue'}
			</Button>
		</div>
	</div>
</Card>

<style>
	.step-content h2 { margin-bottom: var(--space-1); }
	.step-intro { color: var(--neutral-500); font-size: 0.875rem; margin-bottom: var(--space-5); }

	.error-banner {
		background: rgba(240, 80, 80, 0.1); color: #f05050;
		padding: var(--space-3); border-radius: var(--radius-md);
		margin-bottom: var(--space-4); font-size: 0.875rem;
	}

	.field { display: block; margin-bottom: var(--space-5); }
	.field span { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: var(--space-2); color: var(--neutral-700); }
	.field input, .field textarea, .field select {
		width: 100%; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md);
		font-size: 0.9375rem; font-family: inherit; resize: vertical;
		background: white;
	}
	.field input:focus, .field textarea:focus, .field select:focus {
		outline: var(--focus-ring); outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.ai-section { margin-bottom: var(--space-5); }
	.ai-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-3);
	}
	.ai-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }

	.readiness-result {
		background: var(--neutral-50); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
	}

	.score-display {
		display: flex; flex-direction: column; align-items: center;
		margin-bottom: var(--space-4);
	}
	.score-ring {
		width: 80px; height: 80px;
		border: 4px solid; border-radius: 50%;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		margin-bottom: var(--space-2);
	}
	.score-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
	.score-label { font-size: 0.6875rem; color: var(--neutral-400); }
	.score-verdict { font-size: 0.875rem; font-weight: 600; }

	.gaps-section, .blockers-section { margin-top: var(--space-4); }
	.gaps-section h4, .blockers-section h4 {
		font-size: 0.8125rem; font-weight: 600; color: var(--neutral-500);
		text-transform: uppercase; letter-spacing: 0.05em;
		margin-bottom: var(--space-2);
	}

	.gap-item {
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--neutral-200);
	}
	.gap-item:last-child { border-bottom: none; }
	.gap-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-1);
	}
	.gap-area { font-weight: 500; font-size: 0.875rem; }
	.gap-severity { font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
	.gap-desc { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-1); }
	.gap-rec { font-size: 0.8125rem; color: var(--primary-600); }

	.blocker-item {
		font-size: 0.875rem; color: #f05050;
		padding: var(--space-1) 0;
	}

	.empty-hint {
		background: var(--neutral-50); border: 1px dashed var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
		text-align: center;
	}
	.empty-hint p { font-size: 0.875rem; color: var(--neutral-400); margin: 0; line-height: 1.5; }

	.readiness-gate {
		background: rgba(240, 80, 80, 0.06); border: 1px solid rgba(240, 80, 80, 0.2);
		border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-4);
	}
	.readiness-gate strong { color: #f05050; font-size: 0.875rem; }
	.readiness-gate p { font-size: 0.8125rem; color: var(--neutral-600); margin: var(--space-1) 0 0; }
	.readiness-gate .gate-detail { color: #f05050; font-weight: 500; }

	.actions {
		display: flex; justify-content: space-between; gap: var(--space-3);
		padding-top: var(--space-4); border-top: 1px solid var(--neutral-100);
	}
</style>
