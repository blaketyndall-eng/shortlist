<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import AlignmentPoll from '$lib/components/alignment/AlignmentPoll.svelte';
	import type { ScopeDecision } from '@shortlist/shared-types';

	const scopeId = $derived($page.params.id);

	interface Recommendation {
		approach: ScopeDecision;
		label: string;
		description: string;
		pros: string[];
		cons: string[];
		estimatedTimeline: string;
		estimatedCost: string;
		riskLevel: 'high' | 'medium' | 'low';
		recommendedIf: string;
	}

	let recommendations: Recommendation[] = $state([]);
	let selectedApproach: ScopeDecision | '' = $state('');
	let scopeData = $state<Record<string, any>>({});
	let generating = $state(false);
	let saving = $state(false);
	let error = $state('');
	let showPoll = $state(false);
	let pollId = $state('');

	onMount(async () => {
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) {
				const data = await res.json();
				scopeData = data.scope?.data ?? {};
				if (scopeData.options) {
					recommendations = scopeData.options.recommendations ?? [];
					selectedApproach = scopeData.options.selectedApproach ?? '';
					pollId = scopeData.options.pollId ?? '';
					if (pollId) showPoll = true;
				}
			}
		} catch { /* use defaults */ }
	});

	async function getRecommendations() {
		generating = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_options_recommend',
					depth: 'deep',
					context: {
						signal: scopeData.signal ?? {},
						cause: scopeData.cause ?? {},
					},
				}),
			});

			if (res.ok) {
				const data = await res.json();
				const result = data.result ?? data.data ?? {};
				recommendations = result.options ?? [];
			} else {
				error = 'Failed to generate recommendations';
			}
		} catch {
			error = 'Network error — check your connection and try again';
		} finally {
			generating = false;
		}
	}

	async function handleSave() {
		if (!selectedApproach) {
			error = 'Select an approach before continuing';
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
				options: {
					recommendations,
					selectedApproach,
					pollId: pollId || undefined,
				},
			};

			const res = await fetch(`/api/scopes/${scopeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					data: updatedData,
					current_step: 'prepare',
				}),
			});

			if (!res.ok) {
				error = 'Failed to save';
				saving = false;
				return;
			}

			goto(`/scope/${scopeId}/prepare`);
		} catch {
			error = 'Network error — check your connection and try again';
			saving = false;
		}
	}

	const riskColors: Record<string, string> = {
		high: '#f05050',
		medium: '#f0a030',
		low: '#50b080',
	};

	const approachIcons: Record<string, string> = {
		buy: '🛒',
		build: '🔧',
		fix: '🔩',
		partner: '🤝',
		do_nothing: '⏸',
	};
</script>

<svelte:head>
	<title>Options — SCOPE</title>
</svelte:head>

<Card>
	<div class="step-content">
		<h2>What are our options?</h2>
		<p class="step-intro">Explore all paths — buy, build, fix, partner, or do nothing. AI will recommend based on your signal and root cause analysis.</p>

		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<!-- Generate Recommendations -->
		<div class="ai-section">
			<div class="ai-header">
				<h3>Approach Recommendations</h3>
				<Button
					variant="secondary"
					size="sm"
					loading={generating}
					onclick={getRecommendations}
				>
					{recommendations.length ? 'Re-generate' : 'Get Recommendations'}
				</Button>
			</div>

			{#if recommendations.length === 0 && !generating}
				<div class="empty-hint">
					<p>Click "Get Recommendations" to have AI analyze your signal and root cause data, then suggest the best path forward — buy, build, fix, partner, or do nothing.</p>
				</div>
			{/if}

			{#if recommendations.length > 0}
				<div class="option-cards">
					{#each recommendations as rec}
						<button
							class="option-card"
							class:selected={selectedApproach === rec.approach}
							onclick={() => (selectedApproach = rec.approach)}
						>
							<div class="option-header">
								<span class="option-icon">{approachIcons[rec.approach] ?? '📋'}</span>
								<span class="option-label">{rec.label}</span>
								<span
									class="option-risk"
									style:color={riskColors[rec.riskLevel] ?? 'var(--neutral-400)'}
								>
									{rec.riskLevel} risk
								</span>
							</div>

							<p class="option-desc">{rec.description}</p>

							<div class="option-meta">
								<span>⏱ {rec.estimatedTimeline}</span>
								<span>💰 {rec.estimatedCost}</span>
							</div>

							<div class="option-pros-cons">
								<div class="pros">
									<span class="label">Pros</span>
									{#each rec.pros as pro}
										<span class="item">+ {pro}</span>
									{/each}
								</div>
								<div class="cons">
									<span class="label">Cons</span>
									{#each rec.cons as con}
										<span class="item">− {con}</span>
									{/each}
								</div>
							</div>

							<p class="option-recommended-if">
								<em>Best if:</em> {rec.recommendedIf}
							</p>

							{#if selectedApproach === rec.approach}
								<div class="selected-badge">Selected</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Team Alignment Poll -->
		<div class="poll-section">
			{#if !showPoll}
				<Button variant="ghost" size="sm" onclick={() => (showPoll = true)}>
					+ Invite team to weigh in on approach
				</Button>
			{:else}
				<div class="poll-wrapper">
					<h3>Team Alignment</h3>
					<p class="poll-hint">Get your team's perspective on the best approach.</p>
					<AlignmentPoll
						projectId={scopeId}
						stage="options"
						contextType="scope_options"
						contextRef={{ scopeId }}
					/>
				</div>
			{/if}
		</div>

		<div class="actions">
			<Button variant="ghost" type="button" onclick={() => goto(`/scope/${scopeId}/cause`)}>
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

	.ai-section { margin-bottom: var(--space-5); }
	.ai-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-3);
	}
	.ai-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }

	.option-cards { display: flex; flex-direction: column; gap: var(--space-3); }

	.option-card {
		background: var(--neutral-50); border: 2px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
		cursor: pointer; text-align: left; width: 100%;
		transition: border-color 0.15s, box-shadow 0.15s;
		position: relative; font-family: inherit;
	}
	.option-card:hover { border-color: var(--neutral-300); }
	.option-card.selected {
		border-color: var(--primary-500);
		box-shadow: 0 0 0 1px var(--primary-500);
	}

	.option-header {
		display: flex; align-items: center; gap: var(--space-2);
		margin-bottom: var(--space-2);
	}
	.option-icon { font-size: 1.25rem; }
	.option-label { font-weight: 600; font-size: 1rem; flex: 1; }
	.option-risk { font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }

	.option-desc { font-size: 0.875rem; color: var(--neutral-600); margin-bottom: var(--space-3); }

	.option-meta {
		display: flex; gap: var(--space-4);
		font-size: 0.8125rem; color: var(--neutral-500);
		margin-bottom: var(--space-3);
	}

	.option-pros-cons {
		display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
		margin-bottom: var(--space-2);
	}
	.pros .label, .cons .label {
		display: block; font-size: 0.6875rem; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.05em;
		margin-bottom: var(--space-1);
	}
	.pros .label { color: #50b080; }
	.cons .label { color: #f05050; }
	.pros .item, .cons .item {
		display: block; font-size: 0.8125rem; color: var(--neutral-500);
		margin-bottom: 2px;
	}

	.option-recommended-if {
		font-size: 0.8125rem; color: var(--neutral-400);
		border-top: 1px solid var(--neutral-200);
		padding-top: var(--space-2); margin-top: var(--space-2);
	}
	.option-recommended-if em { font-style: normal; font-weight: 600; color: var(--neutral-500); }

	.selected-badge {
		position: absolute; top: var(--space-3); right: var(--space-3);
		background: var(--primary-500); color: white;
		font-size: 0.6875rem; font-weight: 600;
		padding: 2px 8px; border-radius: 999px;
	}

	.poll-section { margin-bottom: var(--space-5); }
	.poll-wrapper {
		background: var(--neutral-50); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
	}
	.poll-wrapper h3 { font-size: 0.9375rem; font-weight: 600; margin: 0 0 var(--space-1); }
	.poll-hint { font-size: 0.8125rem; color: var(--neutral-400); margin-bottom: var(--space-3); }

	.empty-hint {
		background: var(--neutral-50); border: 1px dashed var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-4);
		text-align: center;
	}
	.empty-hint p { font-size: 0.875rem; color: var(--neutral-400); margin: 0; line-height: 1.5; }

	.actions {
		display: flex; justify-content: space-between; gap: var(--space-3);
		padding-top: var(--space-4); border-top: 1px solid var(--neutral-100);
	}
</style>
