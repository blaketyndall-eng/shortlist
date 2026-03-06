<script lang="ts">
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const project = data.project;
	const state = project?.state ?? {};
	const solveData = project?.solve_data ?? {};

	const criteria = state.criteria ?? [];
	const stakeholders = solveData.stakeholders ?? [];

	// Pre-eval data
	interface PreEvalScores {
		[userId: string]: { [criterion: string]: number };
	}

	const preEvalScores: PreEvalScores = solveData.preEvalScores ?? {};
	const preEvalDone: Record<string, boolean> = solveData.preEvalDone ?? {};

	// Team members from project members or SOLVE stakeholders
	const teamMembers = $derived(() => {
		const members: { name: string; role: string; done: boolean }[] = [];

		// From stakeholders
		for (const sh of stakeholders) {
			members.push({
				name: sh.name,
				role: sh.role ?? sh.influenceLevel ?? 'Member',
				done: preEvalDone[sh.name] ?? false,
			});
		}

		// If no stakeholders, add placeholder
		if (members.length === 0) {
			members.push({ name: 'You', role: 'Project Lead', done: false });
		}

		return members;
	});

	// Calculate variance for each criterion across team scores
	function calcVariance(criterion: string): { avg: number; min: number; max: number; variance: string } {
		const scores: number[] = [];
		for (const userId of Object.keys(preEvalScores)) {
			const s = preEvalScores[userId]?.[criterion];
			if (s !== undefined) scores.push(s);
		}

		if (scores.length < 2) return { avg: scores[0] ?? 0, min: scores[0] ?? 0, max: scores[0] ?? 0, variance: 'N/A' };

		const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
		const min = Math.min(...scores);
		const max = Math.max(...scores);
		const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length);

		let variance = 'Aligned';
		if (stdDev > 2.5) variance = 'High';
		else if (stdDev > 1.5) variance = 'Medium';

		return { avg, min, max, variance };
	}

	const hasPreEvalData = $derived(Object.keys(preEvalScores).length > 0);
	const completionRate = $derived(() => {
		const members = teamMembers();
		const done = members.filter((m) => m.done).length;
		return members.length > 0 ? Math.round((done / members.length) * 100) : 0;
	});
</script>

<svelte:head>
	<title>Team — {project?.name} — Shortlist</title>
</svelte:head>

<div class="team-tab">
	<!-- Completion Status -->
	<Card>
		<h3 class="section-label">PRE-EVALUATION STATUS</h3>
		<div class="completion-bar-container">
			<div class="completion-bar" style="width: {completionRate()}%"></div>
		</div>
		<p class="completion-text">{completionRate()}% of team members have submitted pre-evaluation scores</p>

		<div class="member-list">
			{#each teamMembers() as member (member.name)}
				<div class="member-row">
					<div class="member-avatar">{member.name.charAt(0)}</div>
					<div class="member-info">
						<span class="member-name">{member.name}</span>
						<span class="member-role">{member.role}</span>
					</div>
					<span class="member-status" class:done={member.done}>
						{member.done ? '✓ Submitted' : 'Pending'}
					</span>
				</div>
			{/each}
		</div>
	</Card>

	<!-- Criteria Importance Alignment -->
	{#if hasPreEvalData && criteria.length > 0}
		<Card>
			<h3 class="section-label">CRITERIA IMPORTANCE ALIGNMENT</h3>
			<p class="section-hint">How the team rated the importance of each criterion (1-10)</p>
			<div class="alignment-table">
				<div class="at-header">
					<span class="at-name">Criterion</span>
					<span class="at-avg">Avg</span>
					<span class="at-range">Range</span>
					<span class="at-var">Variance</span>
				</div>
				{#each criteria as crit}
					{@const v = calcVariance(crit)}
					<div class="at-row">
						<span class="at-name">{crit}</span>
						<span class="at-avg">{v.avg.toFixed(1)}</span>
						<span class="at-range">{v.min}-{v.max}</span>
						<span class="at-var" class:high-var={v.variance === 'High'} class:med-var={v.variance === 'Medium'} class:aligned={v.variance === 'Aligned'}>
							{v.variance}
						</span>
					</div>
				{/each}
			</div>
		</Card>
	{:else}
		<Card>
			<h3 class="section-label">CRITERIA IMPORTANCE ALIGNMENT</h3>
			<div class="empty-state">
				<p>No pre-evaluation scores submitted yet. Once team members score criteria importance, alignment analysis will appear here.</p>
			</div>
		</Card>
	{/if}

	<!-- Stakeholders from SOLVE -->
	{#if stakeholders.length > 0}
		<Card>
			<h3 class="section-label">STAKEHOLDERS</h3>
			<div class="stakeholder-grid">
				{#each stakeholders as sh}
					<div class="sh-card">
						<div class="sh-avatar">{sh.name.charAt(0)}</div>
						<div class="sh-info">
							<span class="sh-name">{sh.name}</span>
							<span class="sh-detail">{sh.role ?? ''}{sh.department ? ` · ${sh.department}` : ''}</span>
						</div>
						{#if sh.influenceLevel}
							<span class="sh-influence" class:decision={sh.influenceLevel === 'decision_maker'}>
								{sh.influenceLevel.replace('_', ' ')}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</Card>
	{/if}
</div>

<style>
	.team-tab { display: flex; flex-direction: column; gap: var(--space-4); }

	.section-label {
		font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.5px;
		text-transform: uppercase; color: var(--primary-500); margin-bottom: var(--space-3);
	}
	.section-hint { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-3); }

	/* Completion bar */
	.completion-bar-container {
		height: 8px; background: var(--neutral-100); border-radius: 4px;
		overflow: hidden; margin-bottom: var(--space-2);
	}
	.completion-bar {
		height: 100%; background: linear-gradient(90deg, #00cc96, #4a96f8);
		border-radius: 4px; transition: width 0.3s;
	}
	.completion-text { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-4); }

	/* Member list */
	.member-list { display: flex; flex-direction: column; gap: var(--space-2); }
	.member-row {
		display: flex; align-items: center; gap: var(--space-3);
		padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
		background: var(--neutral-50);
	}
	.member-avatar {
		width: 32px; height: 32px; border-radius: 50%;
		background: var(--primary-50, #eef2ff); color: var(--primary-600);
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 0.8125rem; flex-shrink: 0;
	}
	.member-info { flex: 1; display: flex; flex-direction: column; }
	.member-name { font-size: 0.875rem; font-weight: 600; color: var(--neutral-800); }
	.member-role { font-size: 0.75rem; color: var(--neutral-500); }
	.member-status {
		font-size: 0.75rem; font-weight: 600; color: var(--neutral-400);
		padding: 2px 8px; border-radius: 999px; background: var(--neutral-100);
	}
	.member-status.done { background: rgba(0, 204, 150, 0.1); color: #00cc96; }

	/* Alignment table */
	.alignment-table { display: flex; flex-direction: column; gap: 0; }
	.at-header, .at-row {
		display: grid; grid-template-columns: 1fr 50px 70px 80px;
		gap: var(--space-2); padding: var(--space-2) var(--space-3);
		align-items: center;
	}
	.at-header {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; color: var(--neutral-400);
		border-bottom: 1px solid var(--neutral-100);
	}
	.at-row {
		font-size: 0.875rem; border-bottom: 1px solid var(--neutral-50);
	}
	.at-name { color: var(--neutral-700); font-weight: 500; }
	.at-avg { font-weight: 700; color: var(--neutral-800); text-align: center; }
	.at-range { font-size: 0.8125rem; color: var(--neutral-500); text-align: center; }
	.at-var {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; text-align: center; padding: 2px 6px;
		border-radius: var(--radius-sm);
	}
	.high-var { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
	.med-var { background: rgba(245, 158, 11, 0.08); color: #d97706; }
	.aligned { background: rgba(0, 204, 150, 0.08); color: #00cc96; }

	/* Stakeholders */
	.stakeholder-grid { display: flex; flex-direction: column; gap: var(--space-2); }
	.sh-card {
		display: flex; align-items: center; gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
	}
	.sh-avatar {
		width: 28px; height: 28px; border-radius: 50%;
		background: var(--neutral-100); color: var(--neutral-600);
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 0.75rem; flex-shrink: 0;
	}
	.sh-info { flex: 1; }
	.sh-name { font-size: 0.875rem; font-weight: 600; color: var(--neutral-800); }
	.sh-detail { font-size: 0.75rem; color: var(--neutral-500); margin-left: var(--space-2); }
	.sh-influence {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; padding: 2px 8px; border-radius: 999px;
		background: var(--neutral-100); color: var(--neutral-500);
	}
	.sh-influence.decision { background: rgba(74, 150, 248, 0.08); color: #4a96f8; }

	.empty-state {
		text-align: center; padding: var(--space-4);
		color: var(--neutral-500); font-size: 0.875rem;
	}

	@media (max-width: 640px) {
		.at-header, .at-row { grid-template-columns: 1fr 40px 60px; }
		.at-var { display: none; }
	}
</style>
