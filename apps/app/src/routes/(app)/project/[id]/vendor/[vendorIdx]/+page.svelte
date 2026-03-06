<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import ConfidenceBadge from '$components/ui/ConfidenceBadge.svelte';
	import DemoSessionCard from '$components/demo/DemoSessionCard.svelte';
	import VendorClaimsTracker from '$components/demo/VendorClaimsTracker.svelte';
	import DemoQuestionSwiper from '$components/demo/DemoQuestionSwiper.svelte';
	import PreCallBriefing from '$components/demo/PreCallBriefing.svelte';
	import PostCallFeedback from '$components/demo/PostCallFeedback.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();

	const vendorIdx = $derived(parseInt($page.params.vendorIdx ?? '0'));
	const projectId = $derived($page.params.id);
	const vendors = $derived(data.project?.state?.vendors ?? []);
	const vendor = $derived(vendors[vendorIdx] ?? null);
	const vendorName = $derived(typeof vendor === 'string' ? vendor : vendor?.name ?? '');
	const criteria = $derived(data.project?.state?.criteria ?? []);
	const weights = $derived(data.project?.state?.weights ?? {});
	const scores = $derived(data.project?.state?.scores ?? {});
	const solveData = $derived(data.project?.solve_data ?? {});

	// Vendor scores
	const vendorScores = $derived(scores[vendorName] ?? scores[vendorIdx] ?? {});
	const vendorProfile = $derived(solveData.vendorProfiles?.[vendorName] ?? {});

	// Demo sessions for this vendor
	const demoSessions = $derived(
		(solveData.demoSessions ?? []).filter((s: any) => s.vendorName === vendorName)
	);

	// Claims for this vendor
	const vendorClaims = $derived(solveData.vendorClaims?.[vendorName] ?? []);

	// Swiper/overlay states
	let showQuestionSwiper = $state(false);
	let showBriefing = $state(false);
	let showFeedback = $state(false);
	let activeBriefingCards = $state<any[]>([]);
	let activeFeedbackCards = $state<any[]>([]);
	let activeFeedbackSessionId = $state('');
	let demoQuestions = $state<any[]>([]);

	// AI analysis state
	let aiLoading = $state(false);
	let aiAnalysis = $state<{
		strengths: string[];
		weaknesses: string[];
		recommendation: string;
		confidence: number;
	} | null>(null);

	// Notes state
	let notes = $state('');
	let savingNotes = $state(false);

	$effect(() => {
		notes = vendorProfile?.notes ?? (typeof vendor === 'object' ? vendor?.notes : '') ?? '';
	});

	// Keyboard navigation between vendors
	function handleKeydown(e: KeyboardEvent) {
		if (showQuestionSwiper || showBriefing || showFeedback) return;
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.key === 'ArrowLeft' && vendorIdx > 0) {
			goto(`/project/${projectId}/vendor/${vendorIdx - 1}`);
		} else if (e.key === 'ArrowRight' && vendorIdx < vendors.length - 1) {
			goto(`/project/${projectId}/vendor/${vendorIdx + 1}`);
		}
	}

	// Calculate average score
	function calcAvgScore(): string {
		const values = Object.values(vendorScores) as number[];
		if (values.length === 0) return '—';
		return (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1);
	}

	// AI Analysis
	async function runAIAnalysis() {
		if (!vendorName) return;
		aiLoading = true;
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'evaluate',
					depth: 'standard',
					projectId,
					task: 'vendor_analysis',
					context: {
						vendor: vendorName,
						criteria,
						scores: vendorScores,
						profile: vendorProfile,
						projectName: data.project?.name,
						category: data.project?.category,
					},
				}),
			});
			if (res.ok) {
				const result = await res.json();
				aiAnalysis = result.data ?? result;
			}
		} catch {
			// AI is optional
		} finally {
			aiLoading = false;
		}
	}

	// Save notes
	async function saveNotes() {
		savingNotes = true;
		const currentSolveData = data.project?.solve_data ?? {};
		const profiles = { ...(currentSolveData.vendorProfiles ?? {}) };
		profiles[vendorName] = { ...profiles[vendorName], notes };

		await fetch(`/api/projects/${projectId}/solve`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ solveData: { vendorProfiles: profiles } }),
		});
		savingNotes = false;
	}

	// Save claims
	async function saveClaims(claims: any[]) {
		const currentSolveData = data.project?.solve_data ?? {};
		const allClaims = { ...(currentSolveData.vendorClaims ?? {}) };
		allClaims[vendorName] = claims;

		await fetch(`/api/projects/${projectId}/solve`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ solveData: { vendorClaims: allClaims } }),
		});
	}

	// Schedule a demo
	let schedulingDemo = $state(false);
	let newDemoDate = $state('');
	let newDemoNotes = $state('');

	async function scheduleDemo() {
		if (!newDemoDate) return;
		const session = {
			id: `demo_${Date.now()}`,
			vendorName,
			date: newDemoDate,
			attendees: [data.profile?.full_name ?? 'You'],
			status: 'scheduled' as const,
			questionSet: [],
			notes: newDemoNotes,
		};

		const currentSolveData = data.project?.solve_data ?? {};
		const sessions = [...(currentSolveData.demoSessions ?? []), session];

		await fetch(`/api/projects/${projectId}/solve`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ solveData: { demoSessions: sessions } }),
		});

		schedulingDemo = false;
		newDemoDate = '';
		newDemoNotes = '';
	}

	// Demo question swiper
	async function launchQuestions() {
		// Generate AI questions + static ones
		const staticQs = criteria.map((c: string, i: number) => ({
			id: `static_${i}`,
			text: `How does ${vendorName} handle ${c}?`,
			crit: c,
			aiGenerated: false,
		}));

		try {
			const res = await fetch('/api/ai/demo-briefing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					vendorName,
					projectId,
					criteria,
					problemDescription: solveData.problemDescription ?? '',
					vendorProfile,
				}),
			});
			if (res.ok) {
				const result = await res.json();
				const aiQs = (result.questions ?? []).map((q: any, i: number) => ({
					id: `ai_${i}`,
					text: q.text,
					crit: q.crit ?? 'General',
					aiGenerated: true,
					why: q.why,
				}));
				demoQuestions = [...aiQs, ...staticQs];
			} else {
				demoQuestions = staticQs;
			}
		} catch {
			demoQuestions = staticQs;
		}

		showQuestionSwiper = true;
	}

	// Save selected questions
	async function saveSelectedQuestions(selected: any[]) {
		// Save to the latest scheduled session
		const currentSolveData = data.project?.solve_data ?? {};
		const sessions = [...(currentSolveData.demoSessions ?? [])];
		const scheduledSession = sessions.find((s: any) => s.vendorName === vendorName && s.status === 'scheduled');
		if (scheduledSession) {
			scheduledSession.questionSet = selected;
			await fetch(`/api/projects/${projectId}/solve`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ solveData: { demoSessions: sessions } }),
			});
		}
	}

	// Pre-call briefing
	function launchBriefing(sessionId: string) {
		const session = demoSessions.find((s: any) => s.id === sessionId);
		if (!session) return;

		const topCriteria = criteria.slice(0, 3);
		const topOutcomes = (solveData.desiredOutcomes ?? []).slice(0, 3);

		activeBriefingCards = [
			{
				type: 'Challenge',
				color: '#f05050',
				icon: '⚡',
				title: "What we're solving",
				body: `<p>${solveData.problemDescription ?? 'Problem not yet defined'}</p>`,
			},
			{
				type: 'Desired Outcomes',
				color: '#00cc96',
				icon: '🎯',
				title: 'What success looks like',
				body: topOutcomes.length > 0
					? `<ul>${topOutcomes.map((o: string) => `<li>${o}</li>`).join('')}</ul>`
					: '<p>No outcomes defined yet</p>',
			},
			{
				type: 'Top Criteria',
				color: '#4a96f8',
				icon: '📊',
				title: "What we're scoring on",
				body: topCriteria.length > 0
					? `<ul>${topCriteria.map((c: string) => `<li><strong>${c}</strong> — Weight: ${weights[c] ?? '—'}%</li>`).join('')}</ul>`
					: '<p>No criteria defined yet</p>',
			},
			{
				type: 'Vendor',
				color: '#4a96f8',
				icon: '🏢',
				title: vendorName,
				body: `<p>${vendorProfile?.overview ?? 'No vendor profile available.'}</p>${
					vendorProfile?.strengths?.length
						? `<ul>${vendorProfile.strengths.slice(0, 3).map((s: string) => `<li>${s}</li>`).join('')}</ul>`
						: ''
				}`,
			},
			{
				type: 'Demo Questions',
				color: '#a06cf0',
				icon: '❓',
				title: 'Questions for today',
				body: session.questionSet?.length
					? `<ul>${session.questionSet.map((q: any) => `<li>${q.text}</li>`).join('')}</ul>`
					: '<p>No questions prepared — launch the question swiper first.</p>',
			},
		];

		showBriefing = true;
	}

	// Post-call feedback
	function launchFeedback(sessionId: string) {
		activeFeedbackSessionId = sessionId;
		const feedbackCards: any[] = [
			{ type: 'overall', label: 'Overall Rating' },
		];

		// Add criteria cards
		for (const crit of criteria) {
			feedbackCards.push({
				type: 'criteria',
				label: crit,
				criterionName: crit,
				criterionWeight: weights[crit],
			});
		}

		feedbackCards.push({ type: 'complete', label: 'Submit' });
		activeFeedbackCards = feedbackCards;
		showFeedback = true;
	}

	// Save feedback
	async function saveFeedback(feedback: any) {
		const currentSolveData = data.project?.solve_data ?? {};
		const allFeedback = { ...(currentSolveData.demoFeedback ?? {}) };
		const userId = data.profile?.id ?? 'anonymous';

		allFeedback[activeFeedbackSessionId] = {
			...(allFeedback[activeFeedbackSessionId] ?? {}),
			[userId]: feedback,
		};

		// Also mark session as completed
		const sessions = [...(currentSolveData.demoSessions ?? [])];
		const session = sessions.find((s: any) => s.id === activeFeedbackSessionId);
		if (session) session.status = 'completed';

		await fetch(`/api/projects/${projectId}/solve`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				solveData: {
					demoFeedback: allFeedback,
					demoSessions: sessions,
				},
			}),
		});

		showFeedback = false;

		// Trigger AI debrief
		try {
			await fetch('/api/ai/demo-debrief', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: activeFeedbackSessionId,
					projectId,
					vendorName,
					feedback: allFeedback[activeFeedbackSessionId],
				}),
			});
		} catch {
			// Non-critical
		}
	}

	// Mark demo complete
	async function markDemoComplete(sessionId: string) {
		const currentSolveData = data.project?.solve_data ?? {};
		const sessions = [...(currentSolveData.demoSessions ?? [])];
		const session = sessions.find((s: any) => s.id === sessionId);
		if (session) session.status = 'completed';

		await fetch(`/api/projects/${projectId}/solve`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ solveData: { demoSessions: sessions } }),
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:head>
	<title>{vendorName || 'Vendor'} — Shortlist</title>
</svelte:head>

<!-- Swiper Overlays -->
{#if showQuestionSwiper}
	<DemoQuestionSwiper
		questions={demoQuestions}
		{vendorName}
		onsave={saveSelectedQuestions}
		onclose={() => (showQuestionSwiper = false)}
	/>
{/if}

{#if showBriefing}
	<PreCallBriefing
		cards={activeBriefingCards}
		{vendorName}
		onclose={() => (showBriefing = false)}
	/>
{/if}

{#if showFeedback}
	<PostCallFeedback
		cards={activeFeedbackCards}
		{vendorName}
		sessionId={activeFeedbackSessionId}
		onsave={saveFeedback}
		onclose={() => (showFeedback = false)}
	/>
{/if}

{#if vendorName}
	<div class="vendor-detail">
		<!-- Vendor Navigation -->
		<div class="vendor-nav">
			<button
				class="vnav-btn"
				disabled={vendorIdx === 0}
				onclick={() => goto(`/project/${projectId}/vendor/${vendorIdx - 1}`)}
			>
				← Prev
			</button>
			<span class="vnav-pos">{vendorIdx + 1} / {vendors.length}</span>
			<button
				class="vnav-btn"
				disabled={vendorIdx >= vendors.length - 1}
				onclick={() => goto(`/project/${projectId}/vendor/${vendorIdx + 1}`)}
			>
				Next →
			</button>
		</div>

		<header class="vendor-header">
			<div class="vendor-title">
				<a href="/project/{projectId}/dashboard/vendors" class="back-link">← Back to Vendors</a>
				<h1>{vendorName}</h1>
				{#if vendorProfile?.website || (typeof vendor === 'object' && vendor?.website)}
					{@const website = vendorProfile?.website ?? vendor?.website}
					<a href={website?.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener" class="vendor-website">
						{website} ↗
					</a>
				{/if}
			</div>
			<div class="vendor-score-badge">
				<span class="score-value">{calcAvgScore()}</span>
				<span class="score-label">Avg Score</span>
			</div>
		</header>

		<div class="detail-grid">
			<div class="main-col">
				<!-- Vendor Profile -->
				{#if vendorProfile?.overview}
					<Card>
						<div class="section-header">
							<h2>AI Vendor Overview</h2>
							{#if vendorProfile.confirmed}
								<span class="confirmed-badge">✓ Reviewed</span>
							{/if}
						</div>
						<p class="profile-overview">{vendorProfile.overview}</p>
						{#if vendorProfile.strengths?.length}
							<h4 class="sub-heading">Key Strengths</h4>
							<ul class="profile-list">
								{#each vendorProfile.strengths as s}
									<li>{s}</li>
								{/each}
							</ul>
						{/if}
						{#if vendorProfile.concerns?.length}
							<h4 class="sub-heading">Watch Out For</h4>
							<ul class="profile-list concern-list">
								{#each vendorProfile.concerns as c}
									<li>{c}</li>
								{/each}
							</ul>
						{/if}
					</Card>
				{/if}

				<!-- Score Breakdown -->
				<Card>
					<h2>Score Breakdown</h2>
					{#if criteria.length > 0}
						<div class="scores-table">
							{#each criteria as criterion, i (i)}
								{@const score = vendorScores[criterion] ?? vendorScores[i] ?? 0}
								<div class="score-row">
									<div class="criterion-info">
										<span class="criterion-name">{criterion}</span>
										<span class="criterion-weight">Weight: {weights[criterion] ?? 0}%</span>
									</div>
									<div class="score-bar-container">
										<div class="score-bar" style="width: {score * 10}%; background: {score >= 8 ? '#00cc96' : score >= 5 ? '#f0a034' : '#f05050'}"></div>
									</div>
									<span class="score-number" class:high={score >= 8} class:mid={score >= 5 && score < 8} class:low={score < 5}>
										{score}/10
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="empty-text">No criteria defined yet.</p>
					{/if}
				</Card>

				<!-- AI Analysis -->
				<Card>
					<div class="section-header">
						<h2>AI Analysis</h2>
						<Button variant="secondary" size="sm" onclick={runAIAnalysis} loading={aiLoading}>
							{aiAnalysis ? 'Re-analyze' : 'Run Analysis'}
						</Button>
					</div>

					{#if aiAnalysis}
						<div class="ai-results">
							<div class="ai-section">
								<h4>Strengths</h4>
								<ul>
									{#each aiAnalysis.strengths ?? [] as s}
										<li>{s}</li>
									{/each}
								</ul>
							</div>
							<div class="ai-section">
								<h4>Weaknesses</h4>
								<ul>
									{#each aiAnalysis.weaknesses ?? [] as w}
										<li>{w}</li>
									{/each}
								</ul>
							</div>
							<div class="ai-section">
								<h4>Recommendation</h4>
								<p>{aiAnalysis.recommendation}</p>
								<ConfidenceBadge score={aiAnalysis.confidence ?? 70} />
							</div>
						</div>
					{:else if !aiLoading}
						<p class="empty-text">Click "Run Analysis" to get AI-powered insights about this vendor.</p>
					{/if}
				</Card>

				<!-- Demo Sessions -->
				<Card>
					<div class="section-header">
						<h2>Demo Sessions</h2>
						<div class="demo-actions-row">
							<Button variant="secondary" size="sm" onclick={launchQuestions}>
								Prep Questions
							</Button>
							<Button variant="primary" size="sm" onclick={() => (schedulingDemo = true)}>
								+ Schedule Demo
							</Button>
						</div>
					</div>

					{#if schedulingDemo}
						<div class="schedule-form">
							<input type="datetime-local" bind:value={newDemoDate} class="schedule-input" />
							<input type="text" bind:value={newDemoNotes} placeholder="Demo notes (optional)" class="schedule-input" />
							<div class="schedule-actions">
								<Button variant="ghost" size="sm" onclick={() => (schedulingDemo = false)}>Cancel</Button>
								<Button variant="primary" size="sm" onclick={scheduleDemo}>Save</Button>
							</div>
						</div>
					{/if}

					{#if demoSessions.length > 0}
						<div class="demo-sessions-list">
							{#each demoSessions as session (session.id)}
								<DemoSessionCard
									{session}
									onlaunchBriefing={launchBriefing}
									onlaunchQuestions={() => launchQuestions()}
									onmarkComplete={markDemoComplete}
									onshowFeedback={launchFeedback}
									onshowReport={(id) => goto(`/project/${projectId}/dashboard/reports`)}
								/>
							{/each}
						</div>
					{:else}
						<p class="empty-text">No demo sessions scheduled. Click "+ Schedule Demo" to get started.</p>
					{/if}
				</Card>

				<!-- Claims Tracker -->
				<Card>
					<VendorClaimsTracker
						claims={vendorClaims}
						{vendorName}
						onsave={saveClaims}
					/>
				</Card>
			</div>

			<div class="side-col">
				<!-- Quick Info -->
				<Card>
					<h3>Quick Info</h3>
					<div class="info-grid">
						<div class="info-item">
							<span class="info-label">Category</span>
							<span class="info-value">{data.project?.category ?? solveData.category?.label ?? '—'}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Criteria Scored</span>
							<span class="info-value">{Object.keys(vendorScores).length} / {criteria.length}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Demos</span>
							<span class="info-value">{demoSessions.length}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Claims Logged</span>
							<span class="info-value">{vendorClaims.length}</span>
						</div>
					</div>
				</Card>

				<!-- Company Health (if available) -->
				{#if vendorProfile?.companyHealth}
					<Card>
						<h3>Company Health</h3>
						<div class="info-grid">
							{#if vendorProfile.companyHealth.revenueGrowth}
								<div class="info-item">
									<span class="info-label">Revenue Growth</span>
									<span class="info-value">{vendorProfile.companyHealth.revenueGrowth}</span>
								</div>
							{/if}
							{#if vendorProfile.companyHealth.employeeGrowth}
								<div class="info-item">
									<span class="info-label">Employee Growth</span>
									<span class="info-value">{vendorProfile.companyHealth.employeeGrowth}</span>
								</div>
							{/if}
							{#if vendorProfile.companyHealth.acquisitionRisk}
								<div class="info-item">
									<span class="info-label">Acquisition Risk</span>
									<span class="info-value">{vendorProfile.companyHealth.acquisitionRisk}</span>
								</div>
							{/if}
							{#if vendorProfile.companyHealth.glassdoorRating}
								<div class="info-item">
									<span class="info-label">Glassdoor</span>
									<span class="info-value">{vendorProfile.companyHealth.glassdoorRating}/5</span>
								</div>
							{/if}
						</div>
					</Card>
				{/if}

				<!-- Commercial Intelligence -->
				{#if vendorProfile?.year1TCO || vendorProfile?.negotiationTips}
					<Card>
						<h3>Commercial Intel</h3>
						<div class="info-grid">
							{#if vendorProfile.year1TCO}
								<div class="info-item">
									<span class="info-label">Year 1 TCO</span>
									<span class="info-value">{vendorProfile.year1TCO}</span>
								</div>
							{/if}
							{#if vendorProfile.renewalRisk}
								<div class="info-item">
									<span class="info-label">Renewal Risk</span>
									<span class="info-value">{vendorProfile.renewalRisk}</span>
								</div>
							{/if}
						</div>
						{#if vendorProfile.hiddenCosts?.length}
							<h4 class="sub-heading">Hidden Costs</h4>
							<ul class="profile-list concern-list">
								{#each vendorProfile.hiddenCosts as cost}
									<li>{cost}</li>
								{/each}
							</ul>
						{/if}
					</Card>
				{/if}

				<!-- Notes -->
				<Card>
					<h3>Notes</h3>
					<textarea
						class="notes-input"
						bind:value={notes}
						placeholder="Add notes about this vendor..."
						rows="6"
					></textarea>
					<div class="notes-actions">
						<Button variant="secondary" size="sm" onclick={saveNotes} loading={savingNotes}>
							Save Notes
						</Button>
					</div>
				</Card>
			</div>
		</div>
	</div>
{:else}
	<div class="not-found">
		<h2>Vendor not found</h2>
		<a href="/project/{projectId}/dashboard/vendors">Back to vendors</a>
	</div>
{/if}

<style>
	.vendor-detail { max-width: 1100px; margin: 0 auto; padding: var(--space-4) var(--space-6); }

	/* Vendor nav bar */
	.vendor-nav {
		display: flex; align-items: center; justify-content: center;
		gap: var(--space-4); margin-bottom: var(--space-4);
		padding: var(--space-2) 0;
	}
	.vnav-btn {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
		background: white; color: var(--neutral-600);
		font-size: 0.8125rem; cursor: pointer; transition: all 0.15s;
	}
	.vnav-btn:hover:not(:disabled) { border-color: var(--primary-400); color: var(--primary-600); }
	.vnav-btn:disabled { opacity: 0.3; cursor: default; }
	.vnav-pos { font-size: 0.8125rem; color: var(--neutral-400); font-weight: 600; }

	.vendor-header {
		display: flex; justify-content: space-between; align-items: flex-end;
		margin-bottom: var(--space-6);
	}

	.back-link {
		font-size: 0.8125rem; color: var(--neutral-400); text-decoration: none;
		display: block; margin-bottom: var(--space-2);
	}
	.back-link:hover { color: var(--primary-600); }
	.vendor-header h1 { margin-bottom: var(--space-1); }
	.vendor-website { font-size: 0.875rem; color: var(--primary-600); text-decoration: none; }
	.vendor-website:hover { text-decoration: underline; }

	.vendor-score-badge {
		text-align: center; padding: var(--space-3) var(--space-5);
		background: white; border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
	}
	.score-value { display: block; font-size: 2rem; font-weight: 700; color: var(--neutral-900); }
	.score-label { font-size: 0.75rem; color: var(--neutral-400); }

	.detail-grid { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-5); }
	@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }

	.main-col, .side-col { display: flex; flex-direction: column; gap: var(--space-5); }

	h2 { font-size: 1rem; margin-bottom: var(--space-4); }
	h3 { font-size: 0.9375rem; margin-bottom: var(--space-3); }
	.sub-heading {
		font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; color: var(--neutral-500); margin: var(--space-3) 0 var(--space-2);
	}

	.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
	.section-header h2 { margin-bottom: 0; }

	.confirmed-badge {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		padding: 2px 8px; border-radius: 999px;
		background: rgba(0, 204, 150, 0.1); color: #00cc96;
	}

	.profile-overview { font-size: 0.9375rem; color: var(--neutral-600); line-height: 1.7; margin-bottom: var(--space-3); }
	.profile-list { list-style: disc; padding-left: var(--space-4); margin: 0; }
	.profile-list li { font-size: 0.875rem; color: var(--neutral-700); padding: 2px 0; }
	.concern-list li { color: #d97706; }

	.scores-table { display: flex; flex-direction: column; gap: var(--space-3); }
	.score-row { display: grid; grid-template-columns: 1fr 200px 60px; align-items: center; gap: var(--space-3); }
	.criterion-name { font-size: 0.875rem; font-weight: 500; color: var(--neutral-700); display: block; }
	.criterion-weight { font-size: 0.6875rem; color: var(--neutral-400); }
	.score-bar-container { height: 8px; background: var(--neutral-100); border-radius: 4px; overflow: hidden; }
	.score-bar { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
	.score-number { font-size: 0.875rem; font-weight: 600; text-align: right; }
	.score-number.high { color: #00cc96; }
	.score-number.mid { color: #f0a034; }
	.score-number.low { color: #f05050; }

	.ai-results { display: flex; flex-direction: column; gap: var(--space-4); }
	.ai-section h4 { font-size: 0.8125rem; font-weight: 600; color: var(--neutral-600); margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.03em; }
	.ai-section ul { list-style: disc; padding-left: var(--space-4); margin: 0; }
	.ai-section li { font-size: 0.875rem; color: var(--neutral-700); padding: 2px 0; }
	.ai-section p { font-size: 0.875rem; color: var(--neutral-700); line-height: 1.5; }

	.demo-actions-row { display: flex; gap: var(--space-2); }
	.demo-sessions-list { display: flex; flex-direction: column; gap: var(--space-3); }

	.schedule-form {
		display: flex; flex-direction: column; gap: var(--space-2);
		padding: var(--space-3); background: var(--neutral-50);
		border-radius: var(--radius-md); margin-bottom: var(--space-3);
	}
	.schedule-input {
		padding: 8px 12px; border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); font-size: 0.875rem;
	}
	.schedule-input:focus { outline: none; border-color: var(--primary-400); }
	.schedule-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }

	.info-grid { display: flex; flex-direction: column; gap: var(--space-3); }
	.info-item { display: flex; justify-content: space-between; font-size: 0.8125rem; }
	.info-label { color: var(--neutral-500); }
	.info-value { font-weight: 500; color: var(--neutral-800); }

	.notes-input {
		width: 100%; border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); padding: var(--space-2) var(--space-3);
		font-size: 0.875rem; font-family: inherit; resize: vertical;
	}
	.notes-input:focus { outline: none; border-color: var(--primary-400); box-shadow: 0 0 0 3px var(--primary-100); }
	.notes-actions { margin-top: var(--space-2); display: flex; justify-content: flex-end; }

	.empty-text { color: var(--neutral-400); font-size: 0.875rem; text-align: center; padding: var(--space-3) 0; }

	.not-found { text-align: center; padding: var(--space-10); color: var(--neutral-500); }
	.not-found a { color: var(--primary-600); }

	@media (max-width: 640px) {
		.score-row { grid-template-columns: 1fr 40px; }
		.score-bar-container { display: none; }
	}
</style>
