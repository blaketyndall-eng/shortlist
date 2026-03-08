<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;
	const solveData = data.project.solve_data ?? {};

	let saving = $state(false);
	let generating = $state(false);
	let challengesReady = $state((solveData.challenges ?? []).length > 0);
	let challengeError = $state('');

	// Challenge acknowledgment tracking — users must respond to high-severity challenges
	let acknowledgments = $state<Record<number, 'acknowledged' | 'adjusted' | null>>(
		solveData.challengeAcknowledgments ?? {}
	);

	interface Challenge {
		icon: string;
		severity: 'high' | 'medium' | 'low';
		title: string;
		question: string;
		context: string;
	}

	let challenges = $state<Challenge[]>(solveData.challenges ?? []);

	// Gather context for challenge generation
	const questions = solveData.questions ?? {};
	const category = solveData.category ?? {};
	const approach = solveData.approach ?? 'buy';
	const existingTool = questions.currentTool ?? '';
	const teamSize = questions.companySize ?? '';
	const budget = questions.budget ?? '';
	const problemDesc = questions.problemDescription ?? '';
	const vendors = (solveData.discoveredVendors ?? []).filter((v: any) =>
		(solveData.shortlistedVendorIds ?? []).includes(v.id)
	);

	// Poll results from prior steps (surfaced per Pillar 4)
	const discoveryPollId = solveData.discoveryPollId ?? null;
	let pollResults = $state<any>(null);

	$effect(() => {
		if (!discoveryPollId) return;
		fetch(`/api/alignment/poll/${discoveryPollId}`)
			.then(r => r.ok ? r.json() : null)
			.then(data => { if (data) pollResults = data; })
			.catch(() => {});
	});

	const severityColors: Record<string, { border: string; text: string; label: string }> = {
		high: { border: 'rgba(240, 80, 80, 0.3)', text: '#dc2626', label: 'HIGH SIGNAL' },
		medium: { border: 'rgba(240, 160, 52, 0.25)', text: '#d97706', label: 'MEDIUM SIGNAL' },
		low: { border: 'rgba(74, 150, 248, 0.2)', text: '#4a96f8', label: 'LOW SIGNAL' },
	};

	function generateFallbackChallenges(): Challenge[] {
		const result: Challenge[] = [];
		const budgetNum = parseInt(String(budget).replace(/[^0-9]/g, ''), 10) || 0;
		const teamNum = parseInt(String(teamSize), 10) || 0;
		const catName = category.category ?? 'software';

		// Always: process vs tool challenge
		result.push({
			icon: '🔍',
			severity: 'high',
			title: 'Is this really a tooling problem?',
			question: `Before spending on new software: could fixing your existing ${existingTool || 'workflow'} or changing team behavior solve this without buying anything?`,
			context: 'Studies show 40% of software purchases fail to deliver expected ROI — often because the root cause was process or adoption, not the tool.',
		});

		// Budget challenge
		if (budgetNum > 0 && budgetNum < 15000 && catName !== 'project' && catName !== 'collab') {
			result.push({
				icon: '💰',
				severity: 'medium',
				title: 'Is your budget realistic for this category?',
				question: `Your budget of ~$${Math.round(budgetNum / 1000)}k/yr is on the lower end for ${catName} software. Have you confirmed that vendors on your list can actually serve you at this price?`,
				context: 'Vendors routinely quote low to get you in a process, then reveal true costs during contract negotiation. Get all-in pricing in writing before investing evaluation time.',
			});
		}

		// Team size challenge
		if (teamNum > 0 && teamNum < 15 && catName !== 'project' && catName !== 'collab') {
			result.push({
				icon: '👥',
				severity: 'medium',
				title: `Is a full evaluation justified for a team of ${teamNum}?`,
				question: 'For a small team, the overhead of a formal multi-vendor evaluation can exceed the cost savings. Have you considered a shorter pilot-first approach?',
				context: 'Teams under 20 often get better outcomes by picking the market-default, running a 30-day trial, and making a fast decision.',
			});
		}

		// Migration challenge
		if (existingTool && existingTool.toLowerCase() !== 'nothing' && existingTool !== '') {
			result.push({
				icon: '🔄',
				severity: 'medium',
				title: `What does migrating from ${existingTool} actually cost?`,
				question: `Have you fully accounted for the cost and disruption of leaving ${existingTool}? Data migration, retraining, lost productivity during transition, and potential contract penalties?`,
				context: 'Migration costs are consistently underestimated. A realistic migration budget is often 50–150% of first-year license cost.',
			});
		}

		// Build vs buy
		if (approach === 'build' || approach === 'hybrid') {
			result.push({
				icon: '🏗️',
				severity: 'high',
				title: 'Build decisions are rarely reversed cheaply.',
				question: "Custom software becomes the team's long-term maintenance burden. Have you estimated the 3-year total cost of building and maintaining vs. the 3-year SaaS alternative?",
				context: 'Most internal tools end up costing 3–5x more than estimated over 3 years when ongoing maintenance, opportunity cost, and tech debt are included.',
			});
		}

		// Stakeholder alignment - always included
		result.push({
			icon: '🤝',
			severity: 'low',
			title: 'Does your team agree on the problem?',
			question: 'Is everyone on the evaluation team aligned on the root cause? Or are different stakeholders solving for different problems with the same purchase?',
			context: "Misaligned stakeholders are the #1 reason evaluations stall at final decision. Surface disagreements about the problem statement before you're 8 weeks in.",
		});

		return result.slice(0, 4);
	}

	async function generateChallenges() {
		generating = true;
		challengeError = '';
		const budgetNum = parseInt(String(budget).replace(/[^0-9]/g, ''), 10) || 0;
		const catName = category.category ?? 'software';

		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'challenges',
					projectId,
					context: {
						problemDesc, approach, existingTool,
						category: catName, teamSize, budgetNum,
						vendorCount: vendors.length,
					},
				}),
			});

			if (res.ok) {
				const aiData = await res.json();
				if (Array.isArray(aiData.challenges) && aiData.challenges.length > 0) {
					challenges = aiData.challenges;
				} else {
					challenges = generateFallbackChallenges();
				}
			} else {
				challenges = generateFallbackChallenges();
			}
		} catch {
			challenges = generateFallbackChallenges();
			challengeError = 'AI challenge generation failed — showing standard challenges instead.';
		}

		challengesReady = true;
		generating = false;
	}

	// Check if high-severity challenges are all acknowledged
	const highSeverityIndices = $derived(
		challenges.map((c, i) => c.severity === 'high' ? i : -1).filter(i => i >= 0)
	);
	const allHighAcknowledged = $derived(
		highSeverityIndices.every(i => acknowledgments[i] != null)
	);
	const hasAdjustments = $derived(
		Object.values(acknowledgments).some(v => v === 'adjusted')
	);

	async function saveAndTransition() {
		// Block if high-severity challenges are unacknowledged
		if (!allHighAcknowledged) return;

		// If user chose "adjusted" on any challenge, go back to brief instead
		if (hasAdjustments) {
			const newSolveData = {
				...solveData,
				challenges,
				challengeAcknowledgments: acknowledgments,
			};
			await supabase
				.from('projects')
				.update({ solve_data: newSolveData, updated_at: new Date().toISOString() })
				.eq('id', projectId);
			goto(`/project/${projectId}/solve/brief`);
			return;
		}

		saving = true;

		// Save challenges to solve_data
		const newSolveData = {
			...solveData,
			challenges,
			challengeAcknowledgments: acknowledgments,
			lastCompletedStep: 'challenges',
			completedSteps: [...new Set([
				...(solveData.completedSteps ?? []),
				'triggers', 'category', 'vendor_discovery', 'constraints', 'priorities', 'brief', 'challenges',
			])],
		};

		// Transfer SOLVE data to evaluation phase
		const priorities = solveData.priorities ?? { must_have: [], nice_to_have: [], bonus: [] };
		const musts = priorities.must_have ?? [];
		const nices = priorities.nice_to_have ?? [];
		const constraints = (solveData.constraints ?? []).filter((c: any) => c.hardLimit);

		// Build weighted criteria from priorities
		const weightMap: Record<string, number> = { must_have: 35, nice_to_have: 20, bonus: 10 };
		let criteria = musts.slice(0, 8).map((p: any) => ({
			name: p.label, weight: weightMap.must_have, knockout: false,
		}));

		// Add hard constraints as knockout criteria
		constraints.slice(0, 2).forEach((c: any) => {
			if (!criteria.find((x: any) => x.name.toLowerCase().includes(c.description?.toLowerCase().slice(0, 5)))) {
				criteria.unshift({ name: c.description, weight: 30, knockout: true });
			}
		});

		// Default criteria if none exist
		if (criteria.length === 0) {
			criteria = [
				{ name: 'Ease of Use', weight: 25, knockout: false },
				{ name: 'Features', weight: 25, knockout: false },
				{ name: 'Price / Value', weight: 20, knockout: false },
				{ name: 'Support', weight: 15, knockout: false },
				{ name: 'Integration', weight: 15, knockout: false },
			];
		}

		// Normalize weights to 100
		const total = criteria.reduce((a: number, b: any) => a + b.weight, 0);
		criteria = criteria.map((c: any) => ({ ...c, weight: Math.round(c.weight / total * 100) }));
		const diff = 100 - criteria.reduce((a: number, b: any) => a + b.weight, 0);
		if (criteria.length > 0) criteria[0].weight += diff;

		// Build evaluation state
		const vendorNames = vendors.map((v: any) => v.name);
		const evalState = {
			vendors: vendorNames,
			criteria: criteria.map((c: any) => c.name),
			weights: Object.fromEntries(criteria.map((c: any) => [c.name, c.weight])),
			scores: {},
			aiContext: {
				fromSolve: true,
				category: category.label ?? category.category ?? '',
				approach,
				existingTool,
			},
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				phase: 'evaluate',
				current_step: 'discovery',
				state: evalState,
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		saving = false;
		goto(`/project/${projectId}/discovery`);
	}

	// Auto-generate on mount if not already done
	$effect(() => {
		if (!challengesReady && !generating) {
			generateChallenges();
		}
	});
</script>

<svelte:head>
	<title>Validate Decision — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-challenges">
	<h2>Before you commit — a quick sanity check.</h2>
	<p class="step-description">
		These are the questions a good consultant would ask. Answer them honestly. They won't change your brief, but they might change your mind.
	</p>

	{#if challengeError}
		<div class="warning-banner" role="alert">{challengeError}</div>
	{/if}

	{#if generating}
		<div class="generating">
			<div class="generating-icon">✦</div>
			<p>Generating personalized challenges...</p>
		</div>
	{:else if challengesReady}
		<div class="challenge-list">
			{#each challenges as challenge, i}
				{@const sev = severityColors[challenge.severity] ?? severityColors.low}
				<div
					class="challenge-card"
					class:acknowledged={acknowledgments[i] === 'acknowledged'}
					class:adjusted={acknowledgments[i] === 'adjusted'}
					style="border-color: {sev.border}"
				>
					<div class="challenge-header">
						<span class="challenge-icon">{challenge.icon}</span>
						<div class="challenge-meta">
							<h3 class="challenge-title">{challenge.title}</h3>
							<span class="challenge-severity" style="color: {sev.text}">
								{sev.label}
							</span>
						</div>
					</div>
					<p class="challenge-question">{challenge.question}</p>
					<p class="challenge-context">{challenge.context}</p>

					<!-- Challenge acknowledgment (required for high severity) -->
					<div class="challenge-response">
						{#if acknowledgments[i]}
							<span class="challenge-ack-badge">
								{acknowledgments[i] === 'acknowledged' ? '✓ Acknowledged — proceeding as-is' : '↩ Adjusted — going back to refine'}
							</span>
						{:else}
							<div class="challenge-ack-buttons">
								<button class="ack-btn ack-proceed" onclick={() => (acknowledgments[i] = 'acknowledged')}>
									I've considered this — proceed
								</button>
								{#if challenge.severity === 'high'}
									<button class="ack-btn ack-adjust" onclick={() => (acknowledgments[i] = 'adjusted')}>
										This changes things — adjust
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Team alignment from polls -->
		{#if pollResults?.summary?.overallScore != null}
			<div class="alignment-reminder">
				<span class="alignment-score" style="color: {pollResults.summary.overallScore >= 70 ? '#00cc96' : pollResults.summary.overallScore >= 40 ? '#d97706' : '#dc2626'}">
					{pollResults.summary.overallScore}% team alignment
				</span>
				{#if pollResults.summary.overallScore < 60}
					<span class="alignment-warn">— consider revisiting alignment before committing</span>
				{/if}
			</div>
		{/if}

		<!-- Guidance box -->
		<div class="guidance-box">
			<div class="guidance-strong">If you answered yes to the challenges above — go back and adjust.</div>
			<p class="guidance-text">
				If you're confident in the decision, proceed. The brief and vendor list are ready to carry into your evaluation.
			</p>
		</div>
	{/if}

	{#if challengesReady && !allHighAcknowledged}
		<div class="enforcement-notice">
			<p>⚠ Please respond to all high-signal challenges before continuing. This ensures your decision is pressure-tested.</p>
		</div>
	{/if}

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${projectId}/solve/brief`)}>← Back to Brief</Button>
		{#if hasAdjustments}
			<Button variant="primary" onclick={saveAndTransition}>
				↩ Go Back & Adjust
			</Button>
		{:else}
			<Button
				variant="primary"
				onclick={saveAndTransition}
				loading={saving}
				disabled={!challengesReady || !allHighAcknowledged}
			>
				I'm confident — Start Evaluation →
			</Button>
		{/if}
	</div>
</div>

<style>
	.step-challenges h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }
	.warning-banner {
		background: rgba(240, 160, 48, 0.1); color: #d97706;
		padding: var(--space-3); border-radius: var(--radius-md);
		margin-bottom: var(--space-4); font-size: 0.875rem;
	}

	.generating {
		text-align: center; padding: var(--space-8);
		color: var(--neutral-500); font-size: 0.875rem;
	}
	.generating-icon {
		font-size: 1.5rem; margin-bottom: var(--space-2);
		animation: pulse 1.5s ease-in-out infinite;
	}
	@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

	.challenge-list {
		display: flex; flex-direction: column; gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.challenge-card {
		padding: var(--space-4) var(--space-5);
		background: var(--neutral-50);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		transition: border-color 0.15s;
	}

	.challenge-header {
		display: flex; align-items: flex-start; gap: var(--space-2);
		margin-bottom: var(--space-2);
	}
	.challenge-icon { font-size: 1.25rem; line-height: 1; }
	.challenge-meta { flex: 1; }
	.challenge-title {
		font-size: 0.875rem; font-weight: 700; margin: 0 0 2px 0;
		color: var(--neutral-800);
	}
	.challenge-severity {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.8px;
	}

	.challenge-question {
		font-size: 0.875rem; color: var(--neutral-600); line-height: 1.75;
		margin: 0 0 var(--space-2) 0;
	}

	.challenge-context {
		font-size: 0.8125rem; color: var(--neutral-400); font-style: italic;
		line-height: 1.65; margin: 0;
	}

	/* Guidance box */
	.guidance-box {
		padding: var(--space-3) var(--space-4);
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
	}
	.guidance-strong {
		font-size: 0.8125rem; font-weight: 700; margin-bottom: var(--space-1);
		color: var(--neutral-800);
	}
	.guidance-text {
		font-size: 0.8125rem; color: var(--neutral-500); line-height: 1.75; margin: 0;
	}

	/* Challenge response buttons */
	.challenge-response {
		margin-top: var(--space-3);
		padding-top: var(--space-2);
		border-top: 1px solid var(--neutral-100);
	}

	.challenge-ack-buttons {
		display: flex;
		gap: var(--space-2);
	}

	.ack-btn {
		padding: 6px 14px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid;
	}

	.ack-proceed {
		background: rgba(0, 204, 150, 0.06);
		border-color: rgba(0, 204, 150, 0.25);
		color: #00cc96;
	}
	.ack-proceed:hover {
		background: rgba(0, 204, 150, 0.12);
	}

	.ack-adjust {
		background: rgba(240, 160, 52, 0.06);
		border-color: rgba(240, 160, 52, 0.25);
		color: #d97706;
	}
	.ack-adjust:hover {
		background: rgba(240, 160, 52, 0.12);
	}

	.challenge-ack-badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: #00cc96;
	}

	.challenge-card.acknowledged {
		opacity: 0.7;
		border-color: rgba(0, 204, 150, 0.2) !important;
	}

	.challenge-card.adjusted {
		border-color: rgba(240, 160, 52, 0.4) !important;
		background: rgba(240, 160, 52, 0.03);
	}

	.enforcement-notice {
		background: rgba(240, 80, 80, 0.04);
		border: 1px solid rgba(240, 80, 80, 0.15);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		margin-top: var(--space-4);
	}
	.enforcement-notice p {
		font-size: 0.8125rem;
		color: #dc2626;
		margin: 0;
	}

	/* Alignment reminder */
	.alignment-reminder {
		padding: var(--space-3) var(--space-4);
		background: rgba(74, 150, 248, 0.04);
		border: 1px solid rgba(74, 150, 248, 0.15);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
		font-size: 0.8125rem;
	}
	.alignment-score { font-weight: 700; }
	.alignment-warn { color: var(--neutral-500); }

	/* Actions */
	.step-actions {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: var(--space-6); padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	@media (max-width: 640px) {
		.challenge-card { padding: var(--space-3); }
		.step-actions { flex-direction: column; gap: var(--space-3); }
		.challenge-ack-buttons { flex-direction: column; }
	}
</style>
