<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const scopeId = $page.params.id;
	let scope = $state<any>(null);
	let saving = $state(false);
	let generating = $state(false);
	let aiError = $state('');

	let brief = $state<any>(null);
	let requiresApproval = $state(false);
	let approvalStatus = $state('');
	let approverNotes = $state('');
	let sponsorThreshold = $state<number | null>(null);

	onMount(async () => {
		const res = await fetch(`/api/scopes/${scopeId}`);
		if (res.ok) {
			scope = await res.json();
			const e = scope.data?.endorse;
			if (e) {
				brief = e.brief ?? null;
				requiresApproval = e.requiresApproval ?? false;
				approvalStatus = e.approvalStatus ?? '';
				approverNotes = e.approverNotes ?? '';
			}
		}
		// Load sponsor threshold from profile
		try {
			const pRes = await fetch('/api/profile');
			if (pRes.ok) {
				const profile = await pRes.json();
				sponsorThreshold = profile.sponsor_approval_threshold ?? null;
				// Check if approval is required based on budget vs threshold
				const budget = scope?.data?.prepare?.budgetEstimate ?? 0;
				if (sponsorThreshold && budget > sponsorThreshold) {
					requiresApproval = true;
				}
			}
		} catch { /* ignore */ }
	});

	const decision = $derived(scope?.decision ?? scope?.data?.options?.selectedApproach ?? '');
	const budgetEstimate = $derived(scope?.data?.prepare?.budgetEstimate ?? 0);

	const decisionLabels: Record<string, string> = {
		buy: 'Buy Software',
		build: 'Build Internally',
		fix: 'Fix Existing',
		partner: 'Partner / Outsource',
		do_nothing: 'Do Nothing',
	};

	const decisionIcons: Record<string, string> = {
		buy: '🛒', build: '🔨', fix: '🔧', partner: '🤝', do_nothing: '⏸',
	};

	async function generateBrief() {
		generating = true;
		aiError = '';
		try {
			const signal = scope?.data?.signal ?? {};
			const cause = scope?.data?.cause ?? {};
			const options = scope?.data?.options ?? {};
			const prepare = scope?.data?.prepare ?? {};
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_brief_generate',
					depth: 'standard',
					scopeId,
					context: {
						decision,
						trigger: signal.trigger,
						businessImpact: signal.businessImpact,
						urgency: signal.urgency,
						hypothesis: cause.hypothesis,
						selectedApproach: options.selectedApproach,
						reasoning: options.reasoning,
						budgetEstimate: prepare.budgetEstimate,
						timeline: prepare.timeline,
						stakeholders: prepare.stakeholders,
						riskAssessment: prepare.riskAssessment,
						readinessScore: prepare.readinessScore,
						gaps: prepare.gaps,
					},
				}),
			});
			if (res.ok) {
				const data = await res.json();
				brief = data.result ?? data.data ?? {};
			} else {
				aiError = 'Brief generation failed — try again.';
			}
		} catch {
			aiError = 'Brief generation failed — try again.';
		}
		generating = false;
	}

	async function finalize(action: 'approve' | 'do_nothing') {
		saving = true;
		const endorseData = {
			brief,
			requiresApproval,
			approvalStatus: requiresApproval ? approvalStatus : 'self_approved',
			approverNotes,
		};

		// Save endorse data
		await fetch(`/api/scopes/${scopeId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				data: { ...scope?.data, endorse: endorseData },
				current_step: 'endorse',
				status: action === 'do_nothing' ? 'completed' : scope?.status,
				completed_at: action === 'do_nothing' ? new Date().toISOString() : null,
			}),
		});

		if (action === 'do_nothing') {
			goto('/dashboard');
			return;
		}

		// Create project from SCOPE
		try {
			const res = await fetch(`/api/scopes/${scopeId}/to-project`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			if (res.ok) {
				const result = await res.json();
				if (result.project?.id) {
					goto(`/project/${result.project.id}/solve/triggers`);
				} else {
					goto('/dashboard');
				}
			} else {
				goto('/dashboard');
			}
		} catch {
			goto('/dashboard');
		}
	}
</script>

<svelte:head>
	<title>Endorse — SCOPE — Shortlist</title>
</svelte:head>

<div class="step-page">
	<h2>Endorse Decision</h2>
	<p class="step-desc">Generate an executive brief, get sign-off, and take action.</p>

	<!-- Decision Summary -->
	<div class="decision-summary">
		<span class="decision-icon">{decisionIcons[decision] ?? '📋'}</span>
		<div>
			<span class="decision-label">{decisionLabels[decision] ?? decision}</span>
			{#if budgetEstimate}
				<span class="decision-budget">${budgetEstimate.toLocaleString()} estimated</span>
			{/if}
		</div>
		{#if requiresApproval}
			<span class="approval-badge">Approval Required</span>
		{/if}
	</div>

	<!-- Generate Brief -->
	<div class="ai-section">
		<button class="ai-btn" onclick={generateBrief} disabled={generating}>
			{#if generating}
				<span class="spinner"></span> Generating Brief...
			{:else}
				✦ {brief ? 'Regenerate Brief' : 'Generate Executive Brief'}
			{/if}
		</button>
		{#if aiError}
			<div class="ai-error">{aiError}</div>
		{/if}
	</div>

	<!-- Brief Display -->
	{#if brief}
		<div class="brief-document">
			{#if brief.title}
				<h3 class="brief-title">{brief.title}</h3>
			{/if}

			{#if brief.execSummary}
				<div class="brief-section">
					<span class="brief-label">Executive Summary</span>
					<p>{brief.execSummary}</p>
				</div>
			{/if}

			{#if brief.problem}
				<div class="brief-section">
					<span class="brief-label">Problem Statement</span>
					<p>{brief.problem}</p>
				</div>
			{/if}

			{#if brief.analysis}
				<div class="brief-section">
					<span class="brief-label">Analysis</span>
					<p>{brief.analysis}</p>
				</div>
			{/if}

			{#if brief.recommendation}
				<div class="brief-section highlight">
					<span class="brief-label">Recommendation</span>
					<p>{brief.recommendation}</p>
				</div>
			{/if}

			{#if brief.risks?.length}
				<div class="brief-section">
					<span class="brief-label">Key Risks</span>
					{#each brief.risks as risk, i (i)}
						<p class="risk-item">⚠ {risk}</p>
					{/each}
				</div>
			{/if}

			{#if brief.nextSteps?.length}
				<div class="brief-section">
					<span class="brief-label">Next Steps</span>
					{#each brief.nextSteps as step, i (i)}
						<p class="next-step">{i + 1}. {step}</p>
					{/each}
				</div>
			{/if}

			{#if brief.timeline}
				<div class="brief-meta">
					<span>Timeline: {brief.timeline}</span>
					{#if brief.budget}<span>Budget: {brief.budget}</span>{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Approval Section -->
	{#if requiresApproval && brief}
		<div class="approval-section">
			<div class="approval-header">
				<span class="approval-icon">🔒</span>
				<div>
					<span class="approval-title">Executive Approval Required</span>
					<span class="approval-reason">Budget of ${budgetEstimate.toLocaleString()} exceeds the ${sponsorThreshold?.toLocaleString()} threshold</span>
				</div>
			</div>
			<div class="form-group">
				<label for="notes">Approver Notes</label>
				<textarea id="notes" bind:value={approverNotes} rows="2" placeholder="Notes from the approving executive..."></textarea>
			</div>
			<div class="approval-actions">
				<button class="approve-btn" onclick={() => { approvalStatus = 'approved'; }}>
					{approvalStatus === 'approved' ? '✓ Approved' : 'Approve'}
				</button>
				<button class="reject-btn" onclick={() => { approvalStatus = 'rejected'; }}>
					{approvalStatus === 'rejected' ? '✗ Rejected' : 'Reject'}
				</button>
			</div>
		</div>
	{/if}

	<!-- Final Actions -->
	<div class="step-actions">
		<a href="/scope/{scopeId}/prepare" class="btn-ghost">← Back</a>

		{#if decision === 'do_nothing'}
			<button class="btn-primary" onclick={() => finalize('do_nothing')} disabled={saving || !brief}>
				{saving ? 'Saving...' : 'Mark Complete'}
			</button>
		{:else if decision === 'buy'}
			<button
				class="btn-primary"
				onclick={() => finalize('approve')}
				disabled={saving || !brief || (requiresApproval && approvalStatus !== 'approved')}
			>
				{saving ? 'Creating Project...' : 'Create Project & Start SOLVE →'}
			</button>
		{:else}
			<button
				class="btn-primary"
				onclick={() => finalize('approve')}
				disabled={saving || !brief || (requiresApproval && approvalStatus !== 'approved')}
			>
				{saving ? 'Creating Project...' : 'Create Project →'}
			</button>
		{/if}
	</div>
</div>

<style>
	.step-page h2 { color: var(--text, #e2e8f0); margin-bottom: 0.25rem; }
	.step-desc { color: var(--text-muted, #94a3b8); font-size: 0.875rem; margin-bottom: 1.5rem; }

	.decision-summary {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 1rem; background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12); border-radius: 10px;
		margin-bottom: 1.5rem;
	}
	.decision-icon { font-size: 1.5rem; }
	.decision-label { font-weight: 700; font-size: 1rem; color: var(--text, #e2e8f0); display: block; }
	.decision-budget { font-size: 0.8rem; color: var(--text-muted, #94a3b8); }
	.approval-badge {
		margin-left: auto; font-size: 0.65rem; font-weight: 700;
		text-transform: uppercase; letter-spacing: 0.06em;
		padding: 3px 8px; border-radius: 4px;
		background: rgba(245, 158, 11, 0.12); color: #fbbf24;
	}

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

	.brief-document {
		padding: 1.5rem; background: rgba(0, 0, 0, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px;
		margin-bottom: 1.5rem;
	}
	.brief-title {
		font-size: 1.125rem; font-weight: 700; color: var(--text, #e2e8f0);
		margin-bottom: 1.25rem; padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.brief-section { margin-bottom: 1rem; }
	.brief-section.highlight {
		padding: 0.85rem; background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.1); border-radius: 8px;
	}
	.brief-label {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.1em; color: #4a96f8; display: block; margin-bottom: 0.3rem;
	}
	.brief-section.highlight .brief-label { color: #00cc96; }
	.brief-section p { font-size: 0.8125rem; color: var(--text-muted, #94a3b8); margin: 0 0 0.25rem; line-height: 1.5; }
	.risk-item { font-size: 0.8rem; color: #fbbf24; margin: 0 0 0.2rem; }
	.next-step { font-size: 0.8rem; color: var(--text-muted, #94a3b8); margin: 0 0 0.2rem; }
	.brief-meta {
		display: flex; gap: 1.5rem; font-size: 0.75rem;
		color: var(--text-muted, #64748b); margin-top: 1rem;
		padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.approval-section {
		padding: 1rem 1.25rem; background: rgba(245, 158, 11, 0.04);
		border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 10px;
		margin-bottom: 1.5rem;
	}
	.approval-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; }
	.approval-icon { font-size: 1.25rem; }
	.approval-title { font-weight: 600; font-size: 0.875rem; color: #fbbf24; display: block; }
	.approval-reason { font-size: 0.75rem; color: var(--text-muted, #94a3b8); }
	.form-group { margin-bottom: 0.75rem; }
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

	.approval-actions { display: flex; gap: 0.5rem; }
	.approve-btn, .reject-btn {
		padding: 0.45rem 1rem; border-radius: 6px; font-size: 0.8rem;
		font-weight: 600; cursor: pointer; border: 1px solid;
	}
	.approve-btn {
		background: rgba(0, 204, 150, 0.08); border-color: rgba(0, 204, 150, 0.25);
		color: #00cc96;
	}
	.approve-btn:hover { background: rgba(0, 204, 150, 0.15); }
	.reject-btn {
		background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}
	.reject-btn:hover { background: rgba(239, 68, 68, 0.15); }

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
</style>
