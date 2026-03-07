<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import AlignmentScore from './AlignmentScore.svelte';
	import type { AlignmentContext, PollValue } from '@shortlist/shared-types/alignment';

	interface Props {
		projectId: string;
		stage?: string;
		contextType: AlignmentContext;
		contextRef?: Record<string, unknown>;
		compact?: boolean;
	}

	let { projectId, stage, contextType, contextRef, compact = false }: Props = $props();

	const supabase = createSupabaseBrowserClient();

	let poll = $state<any>(null);
	let userResponse = $state<any>(null);
	let responseCount = $state(0);
	let selectedScore = $state(0);
	let comment = $state('');
	let submitting = $state(false);
	let analyzing = $state(false);
	let analysis = $state<any>(null);
	let loading = $state(true);
	let expanded = $state(!compact);
	let showResults = $state(false);
	let roleBreakdown = $state<Record<string, { avg: number; count: number }>>({});

	// Load poll on mount
	$effect(() => {
		loadPoll();
	});

	async function loadPoll() {
		loading = true;
		try {
			const res = await fetch(`/api/alignment/polls?projectId=${projectId}${stage ? `&stage=${stage}` : ''}`);
			if (!res.ok) { loading = false; return; }
			const data = await res.json();

			// Find matching poll for this context
			const matching = data.polls?.find((p: any) =>
				p.context_type === contextType &&
				(!stage || p.solve_stage === stage)
			);

			if (matching) {
				poll = matching;
				responseCount = matching.responseCount ?? 0;
				userResponse = matching.userResponse;
				if (userResponse?.value?.score) {
					selectedScore = userResponse.value.score;
					showResults = true;
				}
				// Load analysis if exists
				await loadAnalysis(matching.id);
				// Load response breakdown
				await loadBreakdown(matching.id);
			}
		} catch (e) {
			console.error('Failed to load poll:', e);
		}
		loading = false;
	}

	async function loadAnalysis(pollId: string) {
		try {
			const res = await fetch(`/api/alignment/polls/${pollId}/analyze`);
			if (res.ok) {
				const data = await res.json();
				analysis = data.analysis;
			}
		} catch { /* ignore */ }
	}

	async function loadBreakdown(pollId: string) {
		try {
			const { data: responses } = await supabase
				.from('alignment_responses')
				.select('value, role')
				.eq('poll_id', pollId);

			if (responses) {
				const grouped: Record<string, number[]> = {};
				for (const r of responses) {
					const role = r.role || 'member';
					if (!grouped[role]) grouped[role] = [];
					const val = r.value as any;
					if (val?.score) grouped[role].push(val.score);
				}
				const breakdown: Record<string, { avg: number; count: number }> = {};
				for (const [role, scores] of Object.entries(grouped)) {
					breakdown[role] = {
						avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 20), // 1-5 → 0-100
						count: scores.length,
					};
				}
				roleBreakdown = breakdown;
			}
		} catch { /* ignore */ }
	}

	async function createAndVote() {
		if (selectedScore === 0) return;
		submitting = true;

		try {
			// Create poll if needed
			if (!poll) {
				const titles: Record<AlignmentContext, string> = {
					vendor_alignment: 'How aligned is the team on vendor direction?',
					priority_alignment: 'How aligned on priority ranking?',
					challenge_alignment: 'How aligned on challenge severity?',
					budget_alignment: 'How aligned on budget allocation?',
					general: 'Does this reflect team consensus?',
				};

				const res = await fetch('/api/alignment/polls', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						projectId,
						title: titles[contextType],
						contextType,
						contextRef,
						solveStage: stage,
						pollType: 'likert',
					}),
				});

				if (res.ok) {
					const data = await res.json();
					poll = data.poll;
				} else {
					submitting = false;
					return;
				}
			}

			// Submit response
			const value: PollValue = { score: selectedScore };
			const res = await fetch(`/api/alignment/polls/${poll.id}/respond`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value, comment: comment || undefined }),
			});

			if (res.ok) {
				userResponse = { value, comment };
				responseCount++;
				showResults = true;
				await loadBreakdown(poll.id);
			}
		} catch (e) {
			console.error('Failed to submit:', e);
		}
		submitting = false;
	}

	async function triggerAnalysis() {
		if (!poll) return;
		analyzing = true;
		try {
			const res = await fetch(`/api/alignment/polls/${poll.id}/analyze`, { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				analysis = data.analysis;
			}
		} catch (e) {
			console.error('Analysis failed:', e);
		}
		analyzing = false;
	}

	const overallScore = $derived(
		analysis?.scores?.overall ??
		(Object.values(roleBreakdown).length > 0
			? Math.round(Object.values(roleBreakdown).reduce((a, b) => a + b.avg, 0) / Object.values(roleBreakdown).length)
			: 0)
	);
</script>

{#if loading}
	<div class="poll-skeleton">Loading alignment...</div>
{:else}
	<div class="alignment-poll" class:compact>
		{#if compact}
			<button class="poll-toggle" onclick={() => expanded = !expanded} type="button">
				<span class="toggle-icon">{expanded ? '▾' : '▸'}</span>
				<span class="toggle-label">Team Alignment</span>
				{#if overallScore > 0}
					<AlignmentScore score={overallScore} size="sm" showLabel={false} />
				{/if}
				<span class="response-badge">{responseCount} responses</span>
			</button>
		{/if}

		{#if expanded}
			<div class="poll-content">
				{#if !showResults}
					<!-- Voting UI -->
					<p class="poll-question">
						{poll?.title ?? 'How aligned is the team?'}
					</p>
					<div class="likert-scale">
						{#each [1, 2, 3, 4, 5] as score}
							<button
								class="likert-btn"
								class:selected={selectedScore === score}
								onclick={() => selectedScore = score}
								type="button"
							>
								{score}
							</button>
						{/each}
					</div>
					<div class="likert-labels">
						<span>Strongly Disagree</span>
						<span>Strongly Agree</span>
					</div>
					{#if !compact}
						<textarea
							class="comment-input"
							placeholder="Add a comment (optional)..."
							bind:value={comment}
							rows="2"
						></textarea>
					{/if}
					<button
						class="submit-btn"
						onclick={createAndVote}
						disabled={selectedScore === 0 || submitting}
						type="button"
					>
						{submitting ? 'Submitting...' : 'Submit Response'}
					</button>
				{:else}
					<!-- Results UI -->
					<div class="results">
						<div class="results-header">
							<AlignmentScore score={overallScore} size={compact ? 'sm' : 'md'} />
							<div class="results-meta">
								<span class="response-count">{responseCount} team responses</span>
								{#if userResponse}
									<span class="your-vote">Your vote: {userResponse.value?.score}/5</span>
								{/if}
							</div>
						</div>

						{#if Object.keys(roleBreakdown).length > 0}
							<div class="role-bars">
								{#each Object.entries(roleBreakdown) as [role, data]}
									<div class="role-bar">
										<span class="role-name">{role}</span>
										<div class="bar-track">
											<div
												class="bar-fill"
												style="width: {data.avg}%; background: {data.avg >= 80 ? '#00cc96' : data.avg >= 60 ? '#4a96f8' : data.avg >= 40 ? '#f5a623' : '#ef4444'}"
											></div>
										</div>
										<span class="bar-value">{data.avg}</span>
										<span class="bar-count">({data.count})</span>
									</div>
								{/each}
							</div>
						{/if}

						{#if analysis?.insights?.length}
							<div class="insights">
								{#each analysis.insights.slice(0, 3) as insight}
									<p class="insight">{insight}</p>
								{/each}
							</div>
						{/if}

						{#if responseCount >= 2 && !analysis}
							<button
								class="analyze-btn"
								onclick={triggerAnalysis}
								disabled={analyzing}
								type="button"
							>
								{analyzing ? 'Analyzing...' : 'Analyze Alignment'}
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.alignment-poll {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.compact { border-radius: var(--radius-md); }

	.poll-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		font-size: var(--text-sm);
		text-align: left;
	}
	.poll-toggle:hover { background: rgba(255, 255, 255, 0.02); }

	.toggle-icon { color: var(--color-text-secondary); font-size: 0.75rem; }
	.toggle-label { font-weight: 600; flex: 1; }
	.response-badge {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary, rgba(255,255,255,0.05));
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.poll-content { padding: var(--space-4); }
	.compact .poll-content { padding: var(--space-3); }

	.poll-question {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--space-3);
	}

	.likert-scale {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-1);
	}

	.likert-btn {
		flex: 1;
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary, rgba(255,255,255,0.03));
		color: var(--color-text-secondary);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.likert-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
	.likert-btn.selected {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.likert-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.6875rem;
		color: var(--neutral-500);
		margin-bottom: var(--space-3);
	}

	.comment-input {
		width: 100%;
		padding: var(--space-2);
		background: var(--color-bg-tertiary, rgba(255,255,255,0.03));
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: 0.8125rem;
		resize: none;
		margin-bottom: var(--space-3);
	}

	.submit-btn, .analyze-btn {
		width: 100%;
		padding: var(--space-2) var(--space-4);
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.submit-btn {
		background: var(--color-primary);
		color: white;
	}
	.analyze-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		margin-top: var(--space-3);
	}
	.submit-btn:disabled, .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.submit-btn:hover:not(:disabled) { opacity: 0.9; }
	.analyze-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }

	.results-header {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.results-meta { display: flex; flex-direction: column; gap: 4px; }
	.response-count { font-size: 0.8125rem; color: var(--color-text-secondary); }
	.your-vote { font-size: 0.75rem; color: var(--color-primary); font-weight: 500; }

	.role-bars { display: flex; flex-direction: column; gap: var(--space-2); }
	.role-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 0.8125rem;
	}
	.role-name {
		width: 80px;
		text-transform: capitalize;
		color: var(--color-text-secondary);
		font-weight: 500;
	}
	.bar-track {
		flex: 1;
		height: 6px;
		background: var(--neutral-700, #333);
		border-radius: 3px;
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.4s ease;
	}
	.bar-value { font-weight: 600; min-width: 24px; text-align: right; }
	.bar-count { font-size: 0.6875rem; color: var(--neutral-500); }

	.insights { margin-top: var(--space-3); }
	.insight {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		padding: var(--space-1) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.insight:last-child { border-bottom: none; }

	.poll-skeleton {
		padding: var(--space-4);
		text-align: center;
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
	}
</style>
