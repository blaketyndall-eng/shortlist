<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import AlignmentPoll from '$lib/components/alignment/AlignmentPoll.svelte';

	const scopeId = $derived($page.params.id);

	let hypothesis = $state('');
	let aiCauses: Array<{
		hypothesis: string;
		likelihood: string;
		rationale: string;
		questionsToValidate: string[];
	}> = $state([]);
	let signalSummary = $state({ trigger: '', urgency: 0, impactedUsers: [] as string[], businessImpact: '' });
	let analyzing = $state(false);
	let saving = $state(false);
	let error = $state('');
	let showPoll = $state(false);
	let pollId = $state('');

	onMount(async () => {
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) {
				const data = await res.json();
				const scopeData = data.scope?.data ?? {};
				if (scopeData.signal) {
					signalSummary = scopeData.signal;
				}
				if (scopeData.cause) {
					hypothesis = scopeData.cause.hypothesis ?? '';
					aiCauses = scopeData.cause.aiCauses ?? [];
					pollId = scopeData.cause.pollId ?? '';
					if (pollId) showPoll = true;
				}
			}
		} catch { /* use defaults */ }
	});

	async function runAnalysis() {
		analyzing = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_cause_analyze',
					depth: 'quick',
					context: {
						trigger: signalSummary.trigger,
						urgency: signalSummary.urgency,
						impactedUsers: signalSummary.impactedUsers,
						businessImpact: signalSummary.businessImpact,
					},
				}),
			});

			if (res.ok) {
				const data = await res.json();
				const result = data.result ?? data.data ?? {};
				aiCauses = result.causes ?? [];
			} else {
				error = 'Analysis failed — try again';
			}
		} catch {
			error = 'Something went wrong during analysis';
		} finally {
			analyzing = false;
		}
	}

	async function handleSave() {
		if (!hypothesis.trim() && aiCauses.length === 0) {
			error = 'Enter a hypothesis or run root cause analysis first';
			return;
		}

		saving = true;
		error = '';

		try {
			const getRes = await fetch(`/api/scopes/${scopeId}`);
			if (!getRes.ok) { error = 'Failed to load scope'; saving = false; return; }
			const { scope } = await getRes.json();

			const updatedData = {
				...scope.data,
				cause: {
					hypothesis: hypothesis.trim(),
					aiCauses,
					pollId: pollId || undefined,
				},
			};

			const res = await fetch(`/api/scopes/${scopeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					data: updatedData,
					current_step: 'options',
				}),
			});

			if (!res.ok) {
				error = 'Failed to save';
				saving = false;
				return;
			}

			goto(`/scope/${scopeId}/options`);
		} catch {
			error = 'Something went wrong';
			saving = false;
		}
	}

	const likelihoodColor: Record<string, string> = {
		high: '#f05050',
		medium: '#f0a030',
		low: '#50b080',
	};
</script>

<svelte:head>
	<title>Cause — SCOPE</title>
</svelte:head>

<Card>
	<div class="step-content">
		<h2>Why is this happening?</h2>
		<p class="step-intro">Dig into root causes before jumping to solutions. Good diagnosis prevents wasted spend.</p>

		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<!-- Signal Summary -->
		{#if signalSummary.trigger}
			<div class="signal-recap">
				<span class="recap-label">Signal</span>
				<p>{signalSummary.trigger}</p>
				{#if signalSummary.impactedUsers.length}
					<span class="recap-meta">Affects: {signalSummary.impactedUsers.join(', ')}</span>
				{/if}
			</div>
		{/if}

		<!-- AI Root Cause Analysis -->
		<div class="ai-section">
			<div class="ai-header">
				<h3>Root Cause Analysis</h3>
				<Button
					variant="secondary"
					size="sm"
					loading={analyzing}
					onclick={runAnalysis}
				>
					{aiCauses.length ? 'Re-analyze' : 'Analyze Root Causes'}
				</Button>
			</div>

			{#if aiCauses.length > 0}
				<div class="cause-cards">
					{#each aiCauses as cause, i}
						<div class="cause-card">
							<div class="cause-header">
								<span class="cause-number">#{i + 1}</span>
								<span
									class="cause-likelihood"
									style:color={likelihoodColor[cause.likelihood?.toLowerCase()] ?? 'var(--neutral-400)'}
								>
									{cause.likelihood} likelihood
								</span>
							</div>
							<p class="cause-hypothesis">{cause.hypothesis}</p>
							<p class="cause-rationale">{cause.rationale}</p>
							{#if cause.questionsToValidate?.length}
								<div class="cause-questions">
									<span>Questions to validate:</span>
									<ul>
										{#each cause.questionsToValidate as q}
											<li>{q}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Owner Hypothesis -->
		<label class="field">
			<span>Your hypothesis</span>
			<textarea
				bind:value={hypothesis}
				placeholder="Based on the analysis above, what do you believe is the primary root cause?"
				rows="3"
			></textarea>
		</label>

		<!-- Team Alignment Poll -->
		<div class="poll-section">
			{#if !showPoll}
				<Button variant="ghost" size="sm" onclick={() => (showPoll = true)}>
					+ Invite team to weigh in
				</Button>
			{:else}
				<div class="poll-wrapper">
					<h3>Team Alignment</h3>
					<p class="poll-hint">Ask your team what they think the root cause is.</p>
					<AlignmentPoll
						projectId={scopeId}
						stage="cause"
						contextType="scope_cause"
						contextRef={{ scopeId }}
					/>
				</div>
			{/if}
		</div>

		<div class="actions">
			<Button variant="ghost" type="button" onclick={() => goto(`/scope/${scopeId}/signal`)}>
				Back
			</Button>
			<Button variant="primary" loading={saving} onclick={handleSave}>
				Save & Continue
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

	.signal-recap {
		background: var(--neutral-50); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-5);
	}
	.recap-label {
		font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.05em; color: var(--neutral-400);
	}
	.signal-recap p { margin: var(--space-1) 0; font-size: 0.9375rem; color: var(--neutral-700); }
	.recap-meta { font-size: 0.8125rem; color: var(--neutral-400); }

	.ai-section { margin-bottom: var(--space-5); }
	.ai-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-3);
	}
	.ai-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }

	.cause-cards { display: flex; flex-direction: column; gap: var(--space-3); }
	.cause-card {
		background: var(--neutral-50); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-3) var(--space-4);
	}
	.cause-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-2);
	}
	.cause-number { font-size: 0.75rem; font-weight: 700; color: var(--neutral-400); }
	.cause-likelihood { font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
	.cause-hypothesis { font-weight: 500; font-size: 0.9375rem; margin-bottom: var(--space-1); }
	.cause-rationale { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-2); }
	.cause-questions span { font-size: 0.75rem; font-weight: 600; color: var(--neutral-400); }
	.cause-questions ul {
		margin: var(--space-1) 0 0 var(--space-4); padding: 0;
		font-size: 0.8125rem; color: var(--neutral-500);
	}
	.cause-questions li { margin-bottom: var(--space-1); }

	.field { display: block; margin-bottom: var(--space-5); }
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

	.poll-section { margin-bottom: var(--space-5); }
	.poll-wrapper {
		background: var(--neutral-50); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
	}
	.poll-wrapper h3 { font-size: 0.9375rem; font-weight: 600; margin: 0 0 var(--space-1); }
	.poll-hint { font-size: 0.8125rem; color: var(--neutral-400); margin-bottom: var(--space-3); }

	.actions {
		display: flex; justify-content: space-between; gap: var(--space-3);
		padding-top: var(--space-4); border-top: 1px solid var(--neutral-100);
	}
</style>
