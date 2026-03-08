<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const scopeId = $page.params.id;
	let scope = $state<any>(null);
	let saving = $state(false);
	let analyzing = $state(false);

	let hypothesis = $state('');
	let aiCauses = $state<any[]>([]);
	let aiError = $state('');

	onMount(async () => {
		const res = await fetch(`/api/scopes/${scopeId}`);
		if (res.ok) {
			scope = await res.json();
			const c = scope.data?.cause;
			if (c) {
				hypothesis = c.hypothesis ?? '';
				aiCauses = c.aiCauses ?? [];
			}
		}
	});

	async function analyzeRootCauses() {
		analyzing = true;
		aiError = '';
		try {
			const signal = scope?.data?.signal ?? {};
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_cause_analyze',
					depth: 'quick',
					scopeId,
					context: {
						trigger: signal.trigger,
						urgency: signal.urgency,
						businessImpact: signal.businessImpact,
						impactedUsers: signal.impactedUsers,
					},
				}),
			});
			if (res.ok) {
				const data = await res.json();
				aiCauses = data.result?.causes ?? data.data?.causes ?? [];
			} else {
				aiError = 'Analysis failed — try again.';
			}
		} catch {
			aiError = 'Analysis failed — try again.';
		}
		analyzing = false;
	}

	async function saveAndContinue() {
		saving = true;
		await fetch(`/api/scopes/${scopeId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				data: { ...scope?.data, cause: { hypothesis: hypothesis.trim(), aiCauses } },
				current_step: 'options',
			}),
		});
		goto(`/scope/${scopeId}/options`);
	}
</script>

<svelte:head>
	<title>Cause — SCOPE — Shortlist</title>
</svelte:head>

<div class="step-page">
	<h2>Diagnose the Root Cause</h2>
	<p class="step-desc">Why is this happening? Use AI to uncover potential root causes, then capture your hypothesis.</p>

	{#if scope?.data?.signal}
		<div class="signal-summary">
			<span class="summary-label">Signal</span>
			<p>{scope.data.signal.trigger}</p>
		</div>
	{/if}

	<div class="ai-section">
		<button class="ai-btn" onclick={analyzeRootCauses} disabled={analyzing}>
			{#if analyzing}
				<span class="spinner"></span> Analyzing...
			{:else}
				✦ Analyze Root Causes
			{/if}
		</button>

		{#if aiError}
			<div class="ai-error">{aiError}</div>
		{/if}

		{#if aiCauses.length > 0}
			<div class="causes-list">
				{#each aiCauses as cause, i (cause.id ?? `cause-${i}`)}
					<div class="cause-card">
						<div class="cause-header">
							<span class="cause-title">{cause.title}</span>
							<span class="cause-likelihood" class:high={cause.likelihood === 'high'} class:medium={cause.likelihood === 'medium'} class:low={cause.likelihood === 'low'}>
								{cause.likelihood}
							</span>
						</div>
						<p class="cause-desc">{cause.description}</p>
						<div class="cause-evidence">
							<span class="evidence-label">Evidence needed:</span> {cause.evidence}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="hypothesis">Your root cause hypothesis</label>
		<textarea id="hypothesis" bind:value={hypothesis} rows="3" placeholder="Based on the analysis, what do you believe is the primary root cause?"></textarea>
	</div>

	<div class="step-actions">
		<a href="/scope/{scopeId}/signal" class="btn-ghost">← Back</a>
		<button class="btn-primary" onclick={saveAndContinue} disabled={!hypothesis.trim() || saving}>
			{saving ? 'Saving...' : 'Continue to Options →'}
		</button>
	</div>
</div>

<style>
	.step-page h2 { color: var(--text, #e2e8f0); margin-bottom: 0.25rem; }
	.step-desc { color: var(--text-muted, #94a3b8); font-size: 0.875rem; margin-bottom: 1.5rem; }

	.signal-summary {
		padding: 0.85rem 1rem; margin-bottom: 1.5rem;
		background: rgba(0, 204, 150, 0.04); border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 8px;
	}
	.summary-label {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.1em; color: #00cc96; display: block; margin-bottom: 0.25rem;
	}
	.signal-summary p { font-size: 0.875rem; color: var(--text, #e2e8f0); margin: 0; }

	.ai-section { margin-bottom: 1.5rem; }

	.ai-btn {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.6rem 1.25rem; background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25); border-radius: 8px;
		color: #00cc96; font-size: 0.8125rem; font-weight: 600; cursor: pointer;
		width: 100%;
	}
	.ai-btn:hover { background: rgba(0, 204, 150, 0.15); }
	.ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.spinner {
		width: 14px; height: 14px; border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: #00cc96; border-radius: 50%;
		animation: spin 0.8s linear infinite; display: inline-block;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	.ai-error {
		margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}

	.causes-list { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }

	.cause-card {
		padding: 0.85rem 1rem; background: rgba(0, 0, 0, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px;
	}
	.cause-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; }
	.cause-title { font-weight: 600; font-size: 0.875rem; color: var(--text, #e2e8f0); }
	.cause-likelihood {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px;
	}
	.cause-likelihood.high { background: rgba(239, 68, 68, 0.12); color: #f87171; }
	.cause-likelihood.medium { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
	.cause-likelihood.low { background: rgba(0, 204, 150, 0.12); color: #00cc96; }

	.cause-desc { font-size: 0.8125rem; color: var(--text-muted, #94a3b8); margin: 0 0 0.35rem; }
	.cause-evidence { font-size: 0.75rem; color: var(--text-muted, #64748b); }
	.evidence-label { font-weight: 600; color: var(--text-muted, #94a3b8); }

	.form-group { margin-bottom: 1.25rem; }
	.form-group label {
		display: block; font-size: 0.8125rem; font-weight: 600;
		color: var(--text, #e2e8f0); margin-bottom: 0.4rem;
	}
	textarea {
		width: 100%; padding: 0.65rem 0.85rem;
		background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px; color: var(--text, #e2e8f0); font-size: 0.875rem;
		font-family: inherit; resize: vertical;
	}
	textarea:focus { outline: none; border-color: #00cc96; box-shadow: 0 0 0 2px rgba(0, 204, 150, 0.15); }
	textarea::placeholder { color: rgba(255, 255, 255, 0.25); }

	.step-actions {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: 2rem; padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.btn-ghost { background: none; border: none; color: var(--text-muted, #94a3b8); font-size: 0.875rem; cursor: pointer; text-decoration: none; }
	.btn-ghost:hover { color: var(--text, #e2e8f0); text-decoration: none; }
	.btn-primary {
		padding: 0.6rem 1.5rem; background: #00cc96; color: #0a0f1e;
		border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;
	}
	.btn-primary:hover { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
