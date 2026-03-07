<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import type { ScopeDecision } from '@shortlist/shared-types';
	import { DECISION_LABELS } from '@shortlist/shared-types';

	const scopeId = $derived($page.params.id);

	interface Brief {
		title: string;
		executiveSummary: string;
		sections: Array<{ heading: string; body: string; keyPoints: string[] }>;
		recommendation: string;
		costOfInaction: string;
		nextSteps: string[];
	}

	let brief = $state<Brief | null>(null);
	let requiresApproval = $state(false);
	let approvalStatus = $state<'pending' | 'approved' | 'rejected' | ''>('');
	let approverNotes = $state('');
	let scopeData = $state<Record<string, any>>({});
	let decision = $state<ScopeDecision | ''>('');
	let sponsorThreshold = $state<number | null>(null);
	let generating = $state(false);
	let saving = $state(false);
	let transitioning = $state(false);
	let error = $state('');

	onMount(async () => {
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) {
				const data = await res.json();
				scopeData = data.scope?.data ?? {};
				decision = data.scope?.decision ?? scopeData.options?.selectedApproach ?? '';
				if (scopeData.endorse) {
					brief = scopeData.endorse.brief ?? null;
					requiresApproval = scopeData.endorse.requiresApproval ?? false;
					approvalStatus = scopeData.endorse.approvalStatus ?? '';
					approverNotes = scopeData.endorse.approverNotes ?? '';
				}
			}

			// Check sponsor threshold from company profile
			const profileRes = await fetch('/api/company-profile');
			if (profileRes.ok) {
				const profileData = await profileRes.json();
				sponsorThreshold = profileData.profile?.sponsor_approval_threshold ?? null;
				// Check if budget exceeds threshold
				const budget = scopeData.prepare?.budgetEstimate ?? 0;
				if (sponsorThreshold && budget > sponsorThreshold) {
					requiresApproval = true;
				}
			}
		} catch { /* use defaults */ }
	});

	async function generateBrief() {
		generating = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_brief_generate',
					depth: 'deep',
					context: {
						signal: scopeData.signal ?? {},
						cause: scopeData.cause ?? {},
						options: scopeData.options ?? {},
						prepare: scopeData.prepare ?? {},
						decision,
					},
				}),
			});

			if (res.ok) {
				const data = await res.json();
				const result = data.result ?? data.data ?? {};
				brief = {
					title: result.title ?? '',
					executiveSummary: result.executiveSummary ?? '',
					sections: result.sections ?? [],
					recommendation: result.recommendation ?? '',
					costOfInaction: result.costOfInaction ?? '',
					nextSteps: result.nextSteps ?? [],
				};
			} else {
				error = 'Failed to generate brief';
			}
		} catch {
			error = 'Something went wrong';
		} finally {
			generating = false;
		}
	}

	async function saveBrief() {
		saving = true;
		error = '';
		try {
			const getRes = await fetch(`/api/scopes/${scopeId}`);
			if (!getRes.ok) { error = 'Failed to load scope'; saving = false; return; }
			const { scope } = await getRes.json();

			const updatedData = {
				...scope.data,
				endorse: {
					brief,
					requiresApproval,
					approvalStatus: approvalStatus || (requiresApproval ? 'pending' : 'approved'),
					approverNotes: approverNotes.trim(),
				},
			};

			const res = await fetch(`/api/scopes/${scopeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					data: updatedData,
					decision: decision || undefined,
				}),
			});

			if (!res.ok) {
				error = 'Failed to save';
				saving = false;
				return;
			}
		} catch {
			error = 'Something went wrong';
			saving = false;
		}
		saving = false;
	}

	async function finalizeScope() {
		transitioning = true;
		error = '';

		// Save brief first
		await saveBrief();
		if (error) { transitioning = false; return; }

		try {
			if (decision === 'do_nothing') {
				// Mark scope complete, no project
				const res = await fetch(`/api/scopes/${scopeId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: 'completed',
						decision: 'do_nothing',
						completed_at: new Date().toISOString(),
					}),
				});

				if (!res.ok) { error = 'Failed to complete'; transitioning = false; return; }
				goto('/dashboard');
			} else {
				// Transition to project
				const res = await fetch(`/api/scopes/${scopeId}/to-project`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ decision }),
				});

				if (res.ok) {
					const data = await res.json();
					if (data.project?.id) {
						goto(`/project/${data.project.id}`);
					} else {
						goto('/dashboard');
					}
				} else {
					error = 'Failed to create project';
					transitioning = false;
				}
			}
		} catch {
			error = 'Something went wrong';
			transitioning = false;
		}
	}

	const canFinalize = $derived(
		brief &&
		decision &&
		(!requiresApproval || approvalStatus === 'approved')
	);

	const actionLabel = $derived(
		decision === 'do_nothing'
			? 'Mark Complete'
			: decision === 'buy'
				? 'Create Project & Start SOLVE'
				: 'Create Project'
	);
</script>

<svelte:head>
	<title>Endorse — SCOPE</title>
</svelte:head>

<Card>
	<div class="step-content">
		<h2>Get the green light</h2>
		<p class="step-intro">Generate a decision brief and secure endorsement. This is your case for action.</p>

		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<!-- Decision Summary -->
		{#if decision}
			<div class="decision-banner">
				<span class="decision-label">Recommended approach</span>
				<span class="decision-value">{DECISION_LABELS[decision] ?? decision}</span>
			</div>
		{/if}

		<!-- Generate Brief -->
		<div class="ai-section">
			<div class="ai-header">
				<h3>Decision Brief</h3>
				<Button
					variant="secondary"
					size="sm"
					loading={generating}
					onclick={generateBrief}
				>
					{brief ? 'Re-generate Brief' : 'Generate Brief'}
				</Button>
			</div>

			{#if brief}
				<div class="brief-content">
					<h3 class="brief-title">{brief.title}</h3>

					<div class="brief-section">
						<h4>Executive Summary</h4>
						<p>{brief.executiveSummary}</p>
					</div>

					{#each brief.sections as section}
						<div class="brief-section">
							<h4>{section.heading}</h4>
							<p>{section.body}</p>
							{#if section.keyPoints?.length}
								<ul class="key-points">
									{#each section.keyPoints as point}
										<li>{point}</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}

					<div class="brief-section highlight">
						<h4>Recommendation</h4>
						<p>{brief.recommendation}</p>
					</div>

					{#if brief.costOfInaction}
						<div class="brief-section warning">
							<h4>Cost of Inaction</h4>
							<p>{brief.costOfInaction}</p>
						</div>
					{/if}

					{#if brief.nextSteps?.length}
						<div class="brief-section">
							<h4>Next Steps</h4>
							<ol>
								{#each brief.nextSteps as step}
									<li>{step}</li>
								{/each}
							</ol>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Approval Gate -->
		{#if requiresApproval}
			<div class="approval-gate">
				<div class="approval-header">
					<span class="approval-badge">Approval Required</span>
					<span class="approval-reason">
						Budget (${scopeData.prepare?.budgetEstimate?.toLocaleString() ?? '—'}) exceeds approval threshold (${sponsorThreshold?.toLocaleString() ?? '—'})
					</span>
				</div>

				<div class="approval-status">
					{#if approvalStatus === 'approved'}
						<span class="status-approved">✓ Approved</span>
					{:else if approvalStatus === 'rejected'}
						<span class="status-rejected">✗ Rejected</span>
					{:else}
						<span class="status-pending">⏳ Pending approval</span>
					{/if}
				</div>

				<label class="field">
					<span>Approver notes</span>
					<textarea
						bind:value={approverNotes}
						placeholder="Notes from the approving executive…"
						rows="2"
					></textarea>
				</label>

				<div class="approval-actions">
					<Button
						variant="ghost"
						size="sm"
						onclick={() => { approvalStatus = 'rejected'; saveBrief(); }}
					>
						Reject
					</Button>
					<Button
						variant="primary"
						size="sm"
						onclick={() => { approvalStatus = 'approved'; saveBrief(); }}
					>
						Approve
					</Button>
				</div>
			</div>
		{/if}

		<div class="actions">
			<Button variant="ghost" type="button" onclick={() => goto(`/scope/${scopeId}/prepare`)}>
				Back
			</Button>
			<div class="action-group">
				{#if brief}
					<Button variant="ghost" loading={saving} onclick={saveBrief}>
						Save Draft
					</Button>
				{/if}
				<Button
					variant="primary"
					loading={transitioning}
					disabled={!canFinalize}
					onclick={finalizeScope}
				>
					{actionLabel}
				</Button>
			</div>
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

	.decision-banner {
		background: var(--primary-50, rgba(99, 102, 241, 0.08));
		border: 1px solid var(--primary-200, rgba(99, 102, 241, 0.2));
		border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-5);
		display: flex; align-items: center; gap: var(--space-3);
	}
	.decision-label {
		font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.05em; color: var(--neutral-400);
	}
	.decision-value { font-weight: 600; color: var(--primary-600); }

	.ai-section { margin-bottom: var(--space-5); }
	.ai-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-3);
	}
	.ai-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }

	.brief-content {
		background: var(--neutral-50); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
	}
	.brief-title {
		font-size: 1.125rem; font-weight: 700; margin: 0 0 var(--space-4);
		color: var(--neutral-800);
	}
	.brief-section { margin-bottom: var(--space-4); }
	.brief-section:last-child { margin-bottom: 0; }
	.brief-section h4 {
		font-size: 0.8125rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.05em; color: var(--neutral-400);
		margin-bottom: var(--space-2);
	}
	.brief-section p { font-size: 0.9375rem; color: var(--neutral-700); line-height: 1.6; }

	.brief-section.highlight {
		background: rgba(99, 102, 241, 0.06);
		border-radius: var(--radius-md); padding: var(--space-3);
	}
	.brief-section.warning {
		background: rgba(240, 160, 48, 0.08);
		border-radius: var(--radius-md); padding: var(--space-3);
	}

	.key-points, .brief-section ol {
		margin: var(--space-2) 0 0 var(--space-4); padding: 0;
		font-size: 0.875rem; color: var(--neutral-600);
	}
	.key-points li, .brief-section ol li { margin-bottom: var(--space-1); }

	.approval-gate {
		background: rgba(240, 80, 80, 0.04);
		border: 1px solid rgba(240, 80, 80, 0.2);
		border-radius: var(--radius-md); padding: var(--space-4);
		margin-bottom: var(--space-5);
	}
	.approval-header { margin-bottom: var(--space-3); }
	.approval-badge {
		display: inline-block;
		background: #f05050; color: white;
		font-size: 0.6875rem; font-weight: 600;
		padding: 2px 8px; border-radius: 999px;
		margin-right: var(--space-2);
	}
	.approval-reason { font-size: 0.8125rem; color: var(--neutral-500); }

	.approval-status { margin-bottom: var(--space-3); }
	.status-approved { color: #50b080; font-weight: 600; }
	.status-rejected { color: #f05050; font-weight: 600; }
	.status-pending { color: #f0a030; font-weight: 600; }

	.approval-actions {
		display: flex; gap: var(--space-2); justify-content: flex-end;
	}

	.field { display: block; margin-bottom: var(--space-3); }
	.field span { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: var(--space-2); color: var(--neutral-700); }
	.field textarea {
		width: 100%; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md);
		font-size: 0.9375rem; font-family: inherit; resize: vertical;
	}
	.field textarea:focus {
		outline: var(--focus-ring); outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.actions {
		display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
		padding-top: var(--space-4); border-top: 1px solid var(--neutral-100);
	}
	.action-group { display: flex; gap: var(--space-2); }
</style>
