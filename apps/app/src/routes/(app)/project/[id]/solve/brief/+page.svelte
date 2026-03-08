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
	let generatingBrief = $state(false);
	let briefGenerated = $state(!!solveData.brief);
	let briefError = $state('');

	// Gather all solve data for brief generation
	const triggers = solveData.triggers ?? [];
	// Map triggerQuestions array into a more accessible object
	const tq = solveData.triggerQuestions ?? [];
	const questions = {
		problemDescription: tq[0]?.answer ?? '',
		whoAffected: tq[1]?.answer ?? '',
		frequency: tq[2]?.answer ?? '',
		costOfNothing: tq[3]?.answer ?? '',
		successIn90Days: tq[4]?.answer ?? '',
		currentTool: tq[5]?.answer ?? '',
		companySize: tq[6]?.answer ?? '',
		budget: solveData.budgetRange ?? '',
	};
	const category = solveData.category ?? { label: solveData.categoryDetected ?? '' };
	const approach = solveData.approach ?? 'buy';
	const vendors = (solveData.discoveredVendors ?? []).filter((v: any) =>
		(solveData.shortlistedVendorIds ?? []).includes(v.id)
	);
	const constraints = solveData.constraints ?? [];
	const stakeholders = solveData.stakeholders ?? [];
	const priorities = solveData.priorities ?? { must_have: [], nice_to_have: [], bonus: [] };

	// Poll results from prior steps (surfaced per Pillar 4)
	const discoveryPollId = solveData.discoveryPollId ?? null;
	let pollResults = $state<any>(null);
	let pollLoading = $state(false);

	async function loadPollResults() {
		if (!discoveryPollId) return;
		pollLoading = true;
		try {
			const res = await fetch(`/api/alignment/poll/${discoveryPollId}`);
			if (res.ok) {
				pollResults = await res.json();
			}
		} catch { /* ignore */ }
		pollLoading = false;
	}

	$effect(() => { if (discoveryPollId) loadPollResults(); });

	const mustHaves = priorities.must_have ?? [];
	const niceToHaves = priorities.nice_to_have ?? [];
	const bonuses = priorities.bonus ?? [];
	const hardConstraints = constraints.filter((c: any) => c.hardLimit);

	// Brief sections
	let brief = $state(solveData.brief ?? {
		execSummary: '',
		problem: '',
		successCriteria: '',
		peerBenchmark: '',
	});

	// Knockout matrix state
	let knockoutResults = $state<Record<string, { pass: boolean; flags: string[] }>>(
		solveData.knockoutResults ?? {}
	);

	const approachLabels: Record<string, string> = {
		buy: 'Buy commercial software',
		fix: 'Fix the existing process',
		build: 'Build internally',
		hybrid: 'Buy + customize',
	};

	async function generateBrief() {
		generatingBrief = true;
		briefError = '';

		// Build executive summary from SOLVE data
		const catName = category.label ?? category.category ?? 'software';
		const teamSize = questions.companySize ?? '';
		const budget = questions.budget ?? '';
		const existingTool = questions.currentTool ?? '';
		const problemDesc = questions.problemDescription ?? '';
		const whoAffected = questions.whoAffected ?? '';
		const costOfNothing = questions.costOfNothing ?? '';
		const successIn90 = questions.successIn90Days ?? '';

		const mustCount = mustHaves.length + hardConstraints.length;

		const execSummary = [
			`${data.project.name || 'This evaluation'} covers`,
			teamSize ? `a ${teamSize}-person team` : 'your team',
			budget ? `with a ~${budget}/yr budget` : '',
			`looking for ${catName}`,
			existingTool ? `replacing ${existingTool}` : '',
			`. ${vendors.length} vendor${vendors.length !== 1 ? 's are' : ' is'} in scope`,
			`with ${mustCount} hard requirement${mustCount !== 1 ? 's' : ''}.`,
			`Approach: ${approachLabels[approach] ?? approach}.`,
		].filter(Boolean).join(' ').replace(/\s+/g, ' ');

		// Try AI-powered brief generation
		try {
			const res = await fetch(`/api/ai/problem-brief`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					context: {
						problemDesc, whoAffected, costOfNothing, successIn90,
						category: catName, approach, existingTool,
						teamSize, budget, vendorCount: vendors.length,
						mustHaves: mustHaves.map((m: any) => m.label),
						constraints: hardConstraints.map((c: any) => c.description),
					},
				}),
			});
			if (res.ok) {
				const aiData = await res.json();
				brief = {
					execSummary: aiData.execSummary || execSummary,
					problem: aiData.problem || problemDesc,
					successCriteria: aiData.successCriteria || successIn90,
					peerBenchmark: aiData.peerBenchmark || '',
				};
			} else {
				brief = { execSummary, problem: problemDesc, successCriteria: successIn90, peerBenchmark: '' };
			}
		} catch (err: any) {
			brief = { execSummary, problem: problemDesc, successCriteria: successIn90, peerBenchmark: '' };
			briefError = 'AI brief generation encountered an error — using locally-generated brief instead.';
		}

		// Run knockout matrix
		runKnockoutMatrix();
		briefGenerated = true;
		generatingBrief = false;
	}

	/**
	 * Multi-signal knockout matrix — evaluates vendors against must-haves and constraints
	 * using feature matching, risk analysis, compliance checking, and budget validation.
	 */
	function runKnockoutMatrix() {
		const results: Record<string, { pass: boolean; flags: string[]; score: number }> = {};

		for (const vendor of vendors) {
			const flags: string[] = [];
			let knockoutScore = 100;

			const vendorFeatures = (vendor.features ?? []).map((f: string) => f.toLowerCase());
			const vendorRisks = (vendor.risks ?? []).map((r: string) => r.toLowerCase());
			const vendorText = [
				vendor.tagline, vendor.bestFor, vendor.whyFits,
				...(vendor.features ?? []), ...(vendor.fitSignals ?? []),
			].filter(Boolean).join(' ').toLowerCase();

			// 1. Must-have evaluation — multi-word semantic matching
			for (const must of mustHaves) {
				const label = (must.label ?? '').toLowerCase();
				const keywords = label.split(/\s+/).filter((w: string) => w.length > 2);

				// Check if risks explicitly contradict
				const riskConflict = vendorRisks.some((r: string) =>
					keywords.some((k: string) => r.includes(k)) ||
					r.includes(label)
				);
				if (riskConflict) {
					flags.push(`⛔ Risk conflicts with: ${must.label}`);
					knockoutScore -= 25;
				}

				// Check if features support this must-have
				const featureMatch = vendorFeatures.some((f: string) =>
					keywords.some((k: string) => f.includes(k))
				) || vendorText.includes(label);

				if (!featureMatch && !riskConflict) {
					// Not explicitly supported — check broader text
					const broadMatch = keywords.filter((k: string) => vendorText.includes(k));
					if (broadMatch.length === 0) {
						flags.push(`⚠ No evidence for: ${must.label}`);
						knockoutScore -= 15;
					} else if (broadMatch.length < keywords.length * 0.5) {
						flags.push(`△ Partial match on: ${must.label} (${broadMatch.length}/${keywords.length} signals)`);
						knockoutScore -= 5;
					}
				}
			}

			// 2. Hard constraint evaluation — compliance, integration, and deployment checks
			for (const constraint of hardConstraints) {
				const desc = (constraint.description ?? '').toLowerCase();
				const descKeywords = desc.split(/\s+/).filter((w: string) => w.length > 2);

				// Check if vendor risks contradict constraint
				const violated = vendorRisks.some((r: string) =>
					descKeywords.some((k: string) => r.includes(k))
				);
				if (violated) {
					flags.push(`⛔ Constraint violated: ${constraint.description}`);
					knockoutScore -= 30;
				}

				// Check if vendor info supports constraint (compliance terms, integrations, etc.)
				const complianceTerms = ['soc', 'iso', 'hipaa', 'gdpr', 'fedramp', 'pci', 'ccpa', 'nist'];
				const isComplianceConstraint = complianceTerms.some((t) => desc.includes(t));
				if (isComplianceConstraint) {
					const certMatch = vendorText.includes(desc.split(' ')[0]);
					if (!certMatch) {
						flags.push(`⚠ No compliance evidence for: ${constraint.description}`);
						knockoutScore -= 20;
					}
				}
			}

			// 3. Budget check — enhanced with tier + pricing signal analysis
			if (questions.budget && vendor.tier) {
				const budgetNum = parseInt(String(questions.budget).replace(/[^0-9]/g, ''), 10);
				if (budgetNum > 0) {
					const tierMins: Record<string, number> = {
						enterprise: 50000, mid_market: 20000, smb: 5000, free: 0,
					};
					const tierMin = tierMins[vendor.tier] ?? 0;
					if (tierMin > budgetNum * 1.5) {
						flags.push('💰 Likely over budget — pricing tier significantly exceeds range');
						knockoutScore -= 20;
					} else if (tierMin > budgetNum) {
						flags.push('💰 Budget stretch — pricing tier is at the high end of range');
						knockoutScore -= 8;
					}
				}
			}

			// 4. Fit score check — if vendor has a very low fit score, flag it
			if (vendor.fitScore != null && vendor.fitScore < 35) {
				flags.push(`📊 Low fit score: ${vendor.fitScore}/100 — poor overall match`);
				knockoutScore -= 15;
			}

			// 5. Fit concern analysis — surface concerns from scoring
			if (vendor.fitConcerns?.length) {
				for (const concern of vendor.fitConcerns.slice(0, 2)) {
					flags.push(`△ ${concern}`);
					knockoutScore -= 5;
				}
			}

			const pass = knockoutScore >= 50 && !flags.some((f: string) => f.startsWith('⛔'));
			results[vendor.id] = { pass, flags, score: Math.max(0, knockoutScore) };
		}
		knockoutResults = results;
	}

	async function saveAndContinue() {
		saving = true;
		const newSolveData = {
			...solveData,
			brief,
			knockoutResults,
			completedSteps: [...new Set([
				...(solveData.completedSteps ?? []),
				'triggers', 'category', 'vendor_discovery', 'constraints', 'priorities', 'brief',
			])],
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				current_step: 'challenges',
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		goto(`/project/${projectId}/solve/challenges`);
	}

	// Auto-generate on mount if not already done
	$effect(() => {
		if (!briefGenerated && !generatingBrief) {
			generateBrief();
		}
	});
</script>

<svelte:head>
	<title>Problem Brief — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-brief">
	<h2>Your Problem Brief</h2>
	<p class="step-description">
		Your shared starting point before any demos begin. Review, export, or challenge the decision below.
	</p>

	{#if briefError}
		<div class="warning-banner" role="alert">{briefError}</div>
	{/if}

	{#if generatingBrief}
		<div class="generating">
			<div class="generating-icon">✦</div>
			<p>Generating your problem brief...</p>
		</div>
	{:else if briefGenerated}
		<!-- Executive Summary -->
		<Card>
			<div class="brief-section">
				<h3 class="section-label">EXECUTIVE SUMMARY</h3>
				<p class="exec-summary">{brief.execSummary}</p>

				<div class="context-bar">
					<div class="context-item">
						<span class="context-key">Category</span>
						<span class="context-val">{category.label ?? category.category ?? '—'}</span>
					</div>
					<div class="context-item">
						<span class="context-key">Approach</span>
						<span class="context-val">{approachLabels[approach] ?? approach}</span>
					</div>
					<div class="context-item">
						<span class="context-key">Vendors</span>
						<span class="context-val">{vendors.length} in scope</span>
					</div>
					{#if questions.currentTool}
						<div class="context-item">
							<span class="context-key">Replacing</span>
							<span class="context-val">{questions.currentTool}</span>
						</div>
					{/if}
				</div>
			</div>
		</Card>

		<!-- The Problem -->
		{#if brief.problem}
			<Card>
				<div class="brief-section">
					<h3 class="section-label">THE PROBLEM</h3>
					<p class="section-text">{brief.problem}</p>
					{#if questions.whoAffected}
						<div class="kv-row">
							<span class="kv-key">Who's affected</span>
							<span class="kv-val">{questions.whoAffected}</span>
						</div>
					{/if}
					{#if questions.costOfNothing}
						<div class="kv-row">
							<span class="kv-key">Cost of inaction</span>
							<span class="kv-val">{questions.costOfNothing}</span>
						</div>
					{/if}
					{#if brief.successCriteria}
						<div class="kv-row">
							<span class="kv-key">Success in 90 days</span>
							<span class="kv-val">{brief.successCriteria}</span>
						</div>
					{/if}
				</div>
			</Card>
		{/if}

		<!-- Hard Requirements -->
		{#if mustHaves.length > 0 || hardConstraints.length > 0}
			<Card>
				<div class="brief-section">
					<h3 class="section-label">HARD REQUIREMENTS</h3>
					<p class="section-hint">Walk-away criteria — vendor fails without these</p>
					<ul class="req-list">
						{#each mustHaves as must}
							<li class="req-item req-must">
								<span class="req-badge must">MUST</span>
								{must.label}
							</li>
						{/each}
						{#each hardConstraints as constraint}
							<li class="req-item req-constraint">
								<span class="req-badge constraint">HARD</span>
								{constraint.description}
							</li>
						{/each}
					</ul>
				</div>
			</Card>
		{/if}

		<!-- Nice-to-Have & Bonus -->
		{#if niceToHaves.length > 0 || bonuses.length > 0}
			<Card>
				<div class="brief-section">
					<h3 class="section-label">SECONDARY CRITERIA</h3>
					{#if niceToHaves.length > 0}
						<div class="criteria-group">
							<h4 class="criteria-tier" style="color: #f59e0b">Nice to Have</h4>
							<ul class="criteria-list">
								{#each niceToHaves as item}
									<li>{item.label}</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if bonuses.length > 0}
						<div class="criteria-group">
							<h4 class="criteria-tier" style="color: #00cc96">Bonus</h4>
							<ul class="criteria-list">
								{#each bonuses as item}
									<li>{item.label}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</Card>
		{/if}

		<!-- Knockout Matrix -->
		{#if vendors.length > 0}
			<Card>
				<div class="brief-section">
					<h3 class="section-label">PRE-EVALUATION KNOCKOUT MATRIX</h3>
					<p class="section-hint">Vendors checked against your must-have criteria before demos begin</p>
					<div class="knockout-grid">
						{#each vendors as vendor (vendor.id)}
							{@const result = knockoutResults[vendor.id] ?? { pass: true, flags: [] }}
							<div class="knockout-card" class:knockout-pass={result.pass} class:knockout-fail={!result.pass}>
								<div class="knockout-header">
									<span class="knockout-status">
										{result.pass ? '✓' : '⚠'}
									</span>
									<div class="knockout-vendor">
										<span class="knockout-name">{vendor.name}</span>
										{#if vendor.tier}
											<span class="knockout-tier">{vendor.tier}</span>
										{/if}
									</div>
									<span class="knockout-verdict" class:pass={result.pass} class:fail={!result.pass}>
										{result.pass ? 'Qualified' : 'Flags'}
									</span>
								</div>
								{#if result.flags.length > 0}
									<ul class="knockout-flags">
										{#each result.flags as flag}
											<li class="knockout-flag">{flag}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Stakeholders -->
		{#if stakeholders.length > 0}
			<Card>
				<div class="brief-section">
					<h3 class="section-label">STAKEHOLDERS</h3>
					<div class="stakeholder-grid">
						{#each stakeholders as sh}
							<div class="stakeholder-chip">
								<span class="sh-name">{sh.name}</span>
								<span class="sh-role">{sh.role}{sh.department ? ` · ${sh.department}` : ''}</span>
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Team Alignment (from discovery poll) -->
		{#if pollResults?.summary}
			<Card>
				<div class="brief-section">
					<h3 class="section-label">TEAM ALIGNMENT</h3>
					<p class="section-hint">Results from vendor discovery poll — how aligned is your team?</p>
					<div class="poll-summary">
						{#if pollResults.summary.overallScore != null}
							<div class="poll-score-row">
								<span class="poll-score" style="color: {pollResults.summary.overallScore >= 70 ? '#00cc96' : pollResults.summary.overallScore >= 40 ? '#d97706' : '#dc2626'}">{pollResults.summary.overallScore}%</span>
								<span class="poll-score-label">alignment score</span>
							</div>
						{/if}
						{#if pollResults.summary.responseCount}
							<span class="poll-meta">{pollResults.summary.responseCount} team member{pollResults.summary.responseCount !== 1 ? 's' : ''} responded</span>
						{/if}
						{#if pollResults.summary.topConcerns?.length}
							<div class="poll-concerns">
								<span class="poll-concerns-label">Top concerns:</span>
								{#each pollResults.summary.topConcerns.slice(0, 3) as concern}
									<span class="poll-concern-chip">{concern}</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Peer Benchmark (if available) -->
		{#if brief.peerBenchmark}
			<div class="benchmark-box">
				<div class="benchmark-label">HOW YOU COMPARE — PEER BENCHMARK</div>
				<p class="benchmark-text">{brief.peerBenchmark}</p>
			</div>
		{/if}
	{/if}

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${projectId}/solve/priorities`)}>← Back</Button>
		<div class="action-group">
			<Button variant="secondary" onclick={generateBrief} disabled={generatingBrief}>
				↻ Regenerate
			</Button>
			<Button
				variant="primary"
				onclick={saveAndContinue}
				loading={saving}
				disabled={!briefGenerated}
			>
				Validate Decision →
			</Button>
		</div>
	</div>
</div>

<style>
	.step-brief h2 { margin-bottom: var(--space-1); }
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

	/* Brief sections */
	.brief-section { margin-bottom: 0; }
	.section-label {
		font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.5px;
		text-transform: uppercase; color: var(--primary-500); margin-bottom: var(--space-3);
	}
	.section-hint {
		font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-3);
	}
	.section-text {
		font-size: 0.9375rem; color: var(--neutral-700); line-height: 1.75;
	}

	.exec-summary {
		font-size: 0.9375rem; color: var(--neutral-700); line-height: 1.75;
		margin-bottom: var(--space-4);
	}

	.context-bar {
		display: flex; flex-wrap: wrap; gap: var(--space-2);
	}
	.context-item {
		display: flex; gap: var(--space-2); padding: var(--space-2) var(--space-3);
		background: var(--neutral-50); border: 1px solid var(--neutral-100);
		border-radius: var(--radius-md); font-size: 0.8125rem;
	}
	.context-key { font-weight: 700; color: var(--neutral-700); }
	.context-val { color: var(--neutral-500); }

	/* Key-Value rows */
	.kv-row {
		display: flex; gap: var(--space-3); padding: var(--space-2) var(--space-3);
		background: var(--neutral-50); border: 1px solid var(--neutral-100);
		border-radius: var(--radius-md); margin-top: var(--space-2); font-size: 0.8125rem;
	}
	.kv-key { font-weight: 700; min-width: 110px; flex-shrink: 0; color: var(--neutral-700); }
	.kv-val { color: var(--neutral-500); flex: 1; }

	/* Requirements */
	.req-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
	.req-item {
		display: flex; align-items: center; gap: var(--space-2);
		padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
		font-size: 0.875rem; font-weight: 500;
	}
	.req-must { background: rgba(239, 68, 68, 0.05); color: var(--neutral-800); }
	.req-constraint { background: rgba(245, 158, 11, 0.05); color: var(--neutral-800); }
	.req-badge {
		font-size: 0.625rem; font-weight: 700; letter-spacing: 0.8px;
		padding: 2px 6px; border-radius: var(--radius-sm); text-transform: uppercase;
	}
	.req-badge.must { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
	.req-badge.constraint { background: rgba(245, 158, 11, 0.12); color: #d97706; }

	/* Secondary criteria */
	.criteria-group { margin-bottom: var(--space-3); }
	.criteria-tier { font-size: 0.8125rem; font-weight: 700; margin-bottom: var(--space-1); }
	.criteria-list {
		list-style: disc; padding-left: var(--space-4); margin: 0;
		font-size: 0.875rem; color: var(--neutral-600);
	}
	.criteria-list li { margin-bottom: 2px; }

	/* Knockout matrix */
	.knockout-grid { display: flex; flex-direction: column; gap: var(--space-2); }
	.knockout-card {
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
		padding: var(--space-3); transition: border-color 0.15s;
	}
	.knockout-pass { border-color: rgba(0, 204, 150, 0.3); }
	.knockout-fail { border-color: rgba(239, 68, 68, 0.3); }
	.knockout-header { display: flex; align-items: center; gap: var(--space-2); }
	.knockout-status { font-size: 1.125rem; }
	.knockout-pass .knockout-status { color: #00cc96; }
	.knockout-fail .knockout-status { color: #dc2626; }
	.knockout-vendor { flex: 1; }
	.knockout-name { font-weight: 600; font-size: 0.9375rem; }
	.knockout-tier {
		font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.5px; color: var(--neutral-400); margin-left: var(--space-2);
	}
	.knockout-verdict {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.8px; padding: 2px 8px; border-radius: var(--radius-sm);
	}
	.knockout-verdict.pass { background: rgba(0, 204, 150, 0.1); color: #00cc96; }
	.knockout-verdict.fail { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
	.knockout-flags {
		list-style: none; padding: 0; margin: var(--space-2) 0 0 var(--space-6);
	}
	.knockout-flag {
		font-size: 0.8125rem; color: #dc2626; padding: 2px 0;
	}
	.knockout-flag::before { content: '⚠ '; }

	/* Stakeholders */
	.stakeholder-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
	.stakeholder-chip {
		display: flex; flex-direction: column; gap: 2px;
		padding: var(--space-2) var(--space-3);
		background: var(--neutral-50); border: 1px solid var(--neutral-100);
		border-radius: var(--radius-md);
	}
	.sh-name { font-size: 0.875rem; font-weight: 600; color: var(--neutral-800); }
	.sh-role { font-size: 0.75rem; color: var(--neutral-500); }

	/* Benchmark box */
	.benchmark-box {
		padding: var(--space-4); margin-top: var(--space-4);
		background: rgba(74, 150, 248, 0.04); border: 1px solid rgba(74, 150, 248, 0.15);
		border-radius: var(--radius-lg);
	}
	.benchmark-label {
		font-size: 0.625rem; font-weight: 700; letter-spacing: 1.5px;
		color: var(--accent-500, #4a96f8); margin-bottom: var(--space-2);
	}
	.benchmark-text { font-size: 0.875rem; color: var(--neutral-600); line-height: 1.75; margin: 0; }

	/* Poll summary */
	.poll-summary { display: flex; flex-direction: column; gap: var(--space-2); }
	.poll-score-row { display: flex; align-items: baseline; gap: var(--space-2); }
	.poll-score { font-size: 1.5rem; font-weight: 800; }
	.poll-score-label { font-size: 0.8125rem; color: var(--neutral-500); }
	.poll-meta { font-size: 0.8125rem; color: var(--neutral-400); }
	.poll-concerns { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-1); }
	.poll-concerns-label { font-size: 0.75rem; color: var(--neutral-400); font-weight: 600; }
	.poll-concern-chip {
		font-size: 0.75rem; padding: 2px 8px; border-radius: var(--radius-sm);
		background: rgba(240, 80, 80, 0.06); color: #dc2626;
	}

	/* Actions */
	.step-actions {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: var(--space-6); padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}
	.action-group { display: flex; gap: var(--space-2); }

	@media (max-width: 640px) {
		.context-bar { flex-direction: column; }
		.kv-row { flex-direction: column; gap: var(--space-1); }
		.kv-key { min-width: unset; }
		.action-group { flex-direction: column; }
	}
</style>
