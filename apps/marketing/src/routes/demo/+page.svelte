<script lang="ts">
	let currentStep = $state(0);
	let animating = $state(false);
	let showInsight = $state(false);
	let pollVoted = $state(-1);
	let briefingOpen = $state(false);
	let briefingApproved = $state(false);

	const STEPS = [
		{ id: 'scope', letter: 'S', label: 'Scope', color: '#00cc96' },
		{ id: 'observe', letter: 'O', label: 'Observe', color: '#4a96f8' },
		{ id: 'leverage', letter: 'L', label: 'Leverage', color: '#00cc96' },
		{ id: 'validate', letter: 'V', label: 'Validate', color: '#4a96f8' },
		{ id: 'execute', letter: 'E', label: 'Execute', color: '#00cc96' },
	];

	const ORG = {
		name: 'Meridian Technologies',
		industry: 'B2B SaaS',
		size: '120 employees',
		project: 'CRM Platform Evaluation',
		budget: '$50,000 — $120,000 / year',
		teamLead: 'Sarah Chen',
		teamRole: 'VP of Revenue Operations',
		members: [
			{ name: 'Sarah Chen', role: 'VP RevOps', avatar: 'SC', color: '#00cc96' },
			{ name: 'Marcus Rivera', role: 'Sales Director', avatar: 'MR', color: '#4a96f8' },
			{ name: 'Priya Patel', role: 'CTO', avatar: 'PP', color: '#a06cf0' },
			{ name: 'James Wright', role: 'CFO', avatar: 'JW', color: '#f0a034' },
		],
	};

	const VENDORS = [
		{ name: 'Salesforce', cat: 'Enterprise CRM', fit: 94, av: 'SF', color: '#00cc96', pricing: '$150/user/mo', pros: ['Market leader', 'Deep customization', 'AppExchange ecosystem'], cons: ['Complex implementation', 'Higher TCO'], risk: 'low' },
		{ name: 'HubSpot', cat: 'Mid-Market CRM', fit: 88, av: 'HS', color: '#4a96f8', pricing: '$90/user/mo', pros: ['Intuitive UX', 'Marketing integration', 'Fast deployment'], cons: ['Limited enterprise features', 'Scaling concerns'], risk: 'low' },
		{ name: 'Dynamics 365', cat: 'Enterprise CRM', fit: 82, av: 'DY', color: '#a06cf0', pricing: '$115/user/mo', pros: ['Microsoft ecosystem', 'Strong analytics', 'Power Platform'], cons: ['Complex licensing', 'Steeper learning curve'], risk: 'medium' },
		{ name: 'Pipedrive', cat: 'SMB CRM', fit: 71, av: 'PD', color: '#f0a034', pricing: '$49/user/mo', pros: ['Simple pipeline view', 'Affordable'], cons: ['Limited customization', 'Basic reporting'], risk: 'medium' },
		{ name: 'Zoho CRM', cat: 'Mid-Market CRM', fit: 68, av: 'ZO', color: '#f05050', pricing: '$40/user/mo', pros: ['Full suite integration', 'Price competitive'], cons: ['UI feels dated', 'Support quality varies'], risk: 'medium' },
	];

	const CRITERIA = [
		{ name: 'Ease of Use', weight: 25, scores: [82, 92, 74] },
		{ name: 'Integration Depth', weight: 20, scores: [95, 84, 88] },
		{ name: 'Scalability', weight: 20, scores: [96, 78, 86] },
		{ name: 'Total Cost of Ownership', weight: 15, scores: [68, 85, 72] },
		{ name: 'Analytics & Reporting', weight: 10, scores: [90, 80, 84] },
		{ name: 'Support & SLA', weight: 10, scores: [88, 86, 78] },
	];

	function nextStep() {
		if (currentStep < STEPS.length - 1 && !animating) {
			animating = true;
			setTimeout(() => {
				currentStep++;
				animating = false;
				showInsight = false;
				pollVoted = -1;
				briefingOpen = false; briefingApproved = false;
			}, 300);
		}
	}

	function prevStep() {
		if (currentStep > 0 && !animating) {
			animating = true;
			setTimeout(() => {
				currentStep--;
				animating = false;
				showInsight = false;
				pollVoted = -1;
				briefingOpen = false; briefingApproved = false;
			}, 300);
		}
	}

	function triggerInsight() {
		showInsight = true;
	}

	function votePoll(idx: number) {
		pollVoted = idx;
	}

	function toggleBriefing() {
		briefingOpen = !briefingOpen;
	}
</script>

<svelte:head>
	<title>Interactive Demo — Shortlist</title>
	<meta name="description" content="See Shortlist in action. Walk through a real CRM evaluation with AI-powered purchase intelligence." />
</svelte:head>

<div class="demo-page">
	<!-- Hero -->
	<header class="demo-hero">
		<div class="hero-badge">
			<span class="badge-dot"></span>
			Interactive Demo
		</div>
		<h1>See Shortlist in <span class="highlight">action</span></h1>
		<p class="hero-sub">Follow <strong>{ORG.teamLead}</strong> ({ORG.teamRole}) as her team evaluates CRM platforms for <strong>{ORG.name}</strong>. This demo uses the same SOLVE workflow, AI engines, and alignment tools you'll have access to — with realistic data at every step.</p>
	</header>

	<!-- Org Context Bar -->
	<div class="org-bar">
		<div class="org-info">
			<div class="org-avatar">MT</div>
			<div>
				<span class="org-name">{ORG.name}</span>
				<span class="org-detail">{ORG.industry} · {ORG.size}</span>
			</div>
		</div>
		<div class="org-project">
			<span class="project-label">Active Project</span>
			<span class="project-name">{ORG.project}</span>
		</div>
		<div class="org-team">
			{#each ORG.members as member}
				<div class="team-avatar" style="background: {member.color}22; color: {member.color}" title="{member.name} · {member.role}">{member.avatar}</div>
			{/each}
		</div>
	</div>

	<!-- SOLVE Progress -->
	<div class="solve-progress">
		{#each STEPS as step, i}
			<button
				class="progress-step"
				class:active={i === currentStep}
				class:completed={i < currentStep}
				onclick={() => { if (!animating) { currentStep = i; showInsight = false; pollVoted = -1; briefingOpen = false; briefingApproved = false; } }}
				style="--step-color: {step.color}"
			>
				<span class="step-dot" style="background: {i <= currentStep ? step.color : 'rgba(255,255,255,0.08)'}">
					{#if i < currentStep}
						<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="#0b1017" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{:else}
						{step.letter}
					{/if}
				</span>
				<span class="step-label">{step.label}</span>
			</button>
			{#if i < STEPS.length - 1}
				<div class="progress-line" style="background: {i < currentStep ? 'linear-gradient(90deg, ' + STEPS[i].color + ', ' + STEPS[i+1].color + ')' : 'rgba(255,255,255,0.06)'}"></div>
			{/if}
		{/each}
	</div>

	<!-- Step Content -->
	<div class="step-content" class:fade-out={animating}>

		<!-- ═══ STEP 0: SCOPE ═══ -->
		{#if currentStep === 0}
			<div class="step-panel">
				<div class="panel-header">
					<div class="panel-badge" style="background: {STEPS[0].color}14; color: {STEPS[0].color}; border-color: {STEPS[0].color}30">SCOPE</div>
					<h2>Define what you're buying</h2>
					<p>Shortlist guides your team through a structured intake — budget, timeline, success criteria, and stakeholder requirements — so everyone starts aligned.</p>
				</div>
				<div class="scope-layout">
					<div class="scope-form">
						<div class="form-group filled">
							<label>Project Name</label>
							<div class="form-value">{ORG.project}</div>
						</div>
						<div class="form-group filled">
							<label>Category</label>
							<div class="form-value">CRM & Sales Enablement</div>
						</div>
						<div class="form-group filled">
							<label>Budget Range</label>
							<div class="form-value">{ORG.budget}</div>
						</div>
						<div class="form-group filled">
							<label>Timeline</label>
							<div class="form-value">Q2 2026 — 90-day evaluation</div>
						</div>
						<div class="form-group filled">
							<label>Decision Makers</label>
							<div class="form-value team-row">
								{#each ORG.members as m}
									<span class="mini-avatar" style="background: {m.color}22; color: {m.color}">{m.avatar}</span>
								{/each}
								<span class="member-count">4 stakeholders</span>
							</div>
						</div>
						<div class="form-group filled">
							<label>Key Requirements</label>
							<div class="form-tags">
								<span class="tag">Pipeline Management</span>
								<span class="tag">Marketing Integration</span>
								<span class="tag">Custom Reporting</span>
								<span class="tag">API Access</span>
								<span class="tag">Mobile App</span>
								<span class="tag">SSO / SAML</span>
							</div>
						</div>
					</div>
					<div class="scope-ai-card">
						<div class="ai-card-header">
							<span class="ai-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2.5 5L7 13 4.5 6z" fill="#00cc96" opacity="0.7"/><path d="M7 1l2.5 5L7 13 4.5 6z" stroke="#00cc96" stroke-width="1" stroke-linejoin="round"/></svg></span>
							<span>AI Scope Analysis</span>
						</div>
						<div class="ai-card-body">
							<p class="ai-insight-text">Based on your requirements (pipeline management, custom reporting, API access, SSO) and budget range ($50–120K/yr for ~120 users), this evaluation maps to <strong>mid-to-enterprise CRM platforms</strong>.</p>
							<div class="ai-rec">
								<span class="rec-label">Recommended approach</span>
								<span class="rec-text">Focus evaluation on platforms with native marketing integration to avoid a separate MAP purchase. Your budget supports 3-5 shortlisted vendors.</span>
							</div>
						</div>
					</div>
				</div>
			</div>

		<!-- ═══ STEP 1: OBSERVE ═══ -->
		{:else if currentStep === 1}
			<div class="step-panel">
				<div class="panel-header">
					<div class="panel-badge" style="background: {STEPS[1].color}14; color: {STEPS[1].color}; border-color: {STEPS[1].color}30">OBSERVE</div>
					<h2>AI discovers and scores vendors</h2>
					<p>Shortlist surfaces vendors from a library of 100+ — enriched with pricing, capabilities, and fit scores personalized to Meridian's profile.</p>
				</div>
				<div class="discover-layout">
					<div class="vendor-table">
						<div class="table-header">
							<span class="th-vendor">Vendor</span>
							<span class="th-cat">Category</span>
							<span class="th-pricing">Pricing</span>
							<span class="th-risk">Risk</span>
							<span class="th-fit">Fit Score</span>
						</div>
						{#each VENDORS as v, i}
							<div class="vendor-table-row" style="animation-delay: {i * 120}ms">
								<div class="vt-vendor">
									<div class="vt-av" style="background: {v.color}18; color: {v.color}">{v.av}</div>
									<span class="vt-name">{v.name}</span>
								</div>
								<span class="vt-cat">{v.cat}</span>
								<span class="vt-pricing">{v.pricing}</span>
								<span class="vt-risk" class:risk-low={v.risk === 'low'} class:risk-medium={v.risk === 'medium'}>{v.risk}</span>
								<div class="vt-fit">
									<div class="fit-track"><div class="fit-bar-fill" style="width: {v.fit}%; background: {v.color}"></div></div>
									<span class="fit-num" style="color: {v.color}">{v.fit}</span>
								</div>
							</div>
						{/each}
					</div>
					<div class="discover-sidebar">
						<div class="sidebar-card">
							<h4>Discovery Summary</h4>
							<div class="summary-stat">
								<span class="ss-label">Vendors Analyzed</span>
								<span class="ss-val teal">23</span>
							</div>
							<div class="summary-stat">
								<span class="ss-label">Shortlisted</span>
								<span class="ss-val blue">5</span>
							</div>
							<div class="summary-stat">
								<span class="ss-label">Avg Fit Score</span>
								<span class="ss-val">80.6</span>
							</div>
						</div>
						{#if !showInsight}
							<button class="ai-trigger-btn" onclick={triggerInsight}>
								<span class="ai-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2.5 5L7 13 4.5 6z" fill="#00cc96" opacity="0.7"/><path d="M7 1l2.5 5L7 13 4.5 6z" stroke="#00cc96" stroke-width="1" stroke-linejoin="round"/></svg></span>
								Generate AI Insight
							</button>
						{:else}
							<div class="ai-insight-box fade-in">
								<div class="ai-insight-header">
									<span class="ai-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2.5 5L7 13 4.5 6z" fill="#00cc96" opacity="0.7"/><path d="M7 1l2.5 5L7 13 4.5 6z" stroke="#00cc96" stroke-width="1" stroke-linejoin="round"/></svg></span>
									<span>AI Vendor Intelligence</span>
								</div>
								<p>Salesforce leads on fit score (94) due to deep customization and AppExchange — but watch for <strong>TCO 40% higher</strong> than HubSpot when factoring implementation and admin costs. HubSpot's marketing-native integration could save $18K/yr on a separate MAP tool.</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

		<!-- ═══ STEP 2: LEVERAGE ═══ -->
		{:else if currentStep === 2}
			<div class="step-panel">
				<div class="panel-header">
					<div class="panel-badge" style="background: {STEPS[2].color}14; color: {STEPS[2].color}; border-color: {STEPS[2].color}30">LEVERAGE</div>
					<h2>Compare with weighted scoring</h2>
					<p>Define what matters most, assign weights, and let AI calculate personalized fit scores across every dimension.</p>
				</div>
				<div class="leverage-layout">
					<div class="criteria-panel">
						<h4>Evaluation Criteria</h4>
						{#each CRITERIA as c}
							<div class="criteria-row">
								<span class="cr-name">{c.name}</span>
								<div class="cr-bar-track">
									<div class="cr-bar-fill" style="width: {c.weight}%"></div>
								</div>
								<span class="cr-weight">{c.weight}%</span>
							</div>
						{/each}
					</div>
					<div class="comparison-panel">
						<h4>Head-to-Head: Top 3</h4>
						<div class="comparison-grid">
							<div class="comp-header">
								<span></span>
								{#each VENDORS.slice(0, 3) as v}
									<div class="comp-vendor-head">
										<span class="comp-av" style="background: {v.color}18; color: {v.color}">{v.av}</span>
										<span class="comp-name">{v.name}</span>
									</div>
								{/each}
							</div>
							{#each CRITERIA as c, ci}
								<div class="comp-row">
									<span class="comp-criteria">{c.name}</span>
									<div class="comp-cell">
										<div class="comp-bar" style="width: {c.scores[0]}%; background: #00cc96"></div>
										<span class="comp-score">{c.scores[0]}</span>
									</div>
									<div class="comp-cell">
										<div class="comp-bar" style="width: {c.scores[1]}%; background: #4a96f8"></div>
										<span class="comp-score">{c.scores[1]}</span>
									</div>
									<div class="comp-cell">
										<div class="comp-bar" style="width: {c.scores[2]}%; background: #a06cf0"></div>
										<span class="comp-score">{c.scores[2]}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

		<!-- ═══ STEP 3: VALIDATE ═══ -->
		{:else if currentStep === 3}
			<div class="step-panel">
				<div class="panel-header">
					<div class="panel-badge" style="background: {STEPS[3].color}14; color: {STEPS[3].color}; border-color: {STEPS[3].color}30">VALIDATE</div>
					<h2>Align your team before you decide</h2>
					<p>AI-powered polls detect alignment gaps between roles. Know exactly where your team agrees — and where they don't — before committing.</p>
				</div>
				<div class="validate-layout">
					<div class="alignment-panel">
						<div class="alignment-ring-container">
							<svg class="alignment-ring" viewBox="0 0 120 120">
								<circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
								<circle cx="60" cy="60" r="52" fill="none" stroke="#00cc96" stroke-width="8" stroke-linecap="round"
									stroke-dasharray="{52 * 2 * Math.PI * 0.87} {52 * 2 * Math.PI * 0.13}"
									transform="rotate(-90 60 60)"/>
							</svg>
							<div class="ring-value">
								<span class="ring-number">87</span>
								<span class="ring-label">Aligned</span>
							</div>
						</div>
						<div class="role-breakdown">
							<h4>Alignment by Role</h4>
							{#each [
								{ role: 'VP RevOps', score: 92, color: '#00cc96' },
								{ role: 'Sales Director', score: 88, color: '#4a96f8' },
								{ role: 'CTO', score: 84, color: '#a06cf0' },
								{ role: 'CFO', score: 78, color: '#f0a034' },
							] as r}
								<div class="role-row">
									<span class="role-name">{r.role}</span>
									<div class="role-bar-track">
										<div class="role-bar-fill" style="width: {r.score}%; background: {r.color}"></div>
									</div>
									<span class="role-score" style="color: {r.color}">{r.score}</span>
								</div>
							{/each}
						</div>
					</div>
					<div class="poll-panel">
						<div class="poll-card">
							<div class="poll-header">
								<span class="poll-type">Vendor Alignment Poll</span>
								<span class="poll-status active">Active</span>
							</div>
							<h4>"Which CRM best fits our growth trajectory?"</h4>
							<div class="poll-options">
								{#each [
									{ label: 'Salesforce — strongest long-term scalability', pct: 52 },
									{ label: 'HubSpot — best UX and time-to-value', pct: 35 },
									{ label: 'Dynamics 365 — Microsoft ecosystem synergy', pct: 13 },
								] as opt, oi}
									<button class="poll-option" class:selected={pollVoted === oi} onclick={() => votePoll(oi)}>
										<span class="po-radio" class:filled={pollVoted === oi}></span>
										<span class="po-label">{opt.label}</span>
										{#if pollVoted >= 0}<span class="po-pct">{opt.pct}%</span>{/if}
									</button>
								{/each}
							</div>
							{#if pollVoted >= 0}
								<div class="poll-result fade-in">
									<span class="poll-voters">4 of 4 stakeholders responded</span>
								</div>
							{/if}
						</div>
						<div class="gap-alert">
							<div class="gap-icon">!</div>
							<div class="gap-content">
								<span class="gap-title">Gap Detected: Budget Alignment</span>
								<p>CFO scores 14 points lower than VP RevOps on budget comfort. Recommend scheduling a TCO review meeting before final decision.</p>
							</div>
						</div>
					</div>
				</div>
			</div>

		<!-- ═══ STEP 4: EXECUTE ═══ -->
		{:else if currentStep === 4}
			<div class="step-panel">
				<div class="panel-header">
					<div class="panel-badge" style="background: {STEPS[4].color}14; color: {STEPS[4].color}; border-color: {STEPS[4].color}30">EXECUTE</div>
					<h2>Executive briefing, ready to approve</h2>
					<p>AI generates a complete executive briefing — data-backed recommendation, risk analysis, and next steps — so leadership can approve with confidence.</p>
				</div>
				<div class="execute-layout">
					<div class="exec-dashboard">
						<div class="exec-metrics">
							<div class="exec-metric">
								<span class="em-val teal">5</span>
								<span class="em-label">Vendors Evaluated</span>
							</div>
							<div class="exec-metric">
								<span class="em-val blue">87%</span>
								<span class="em-label">Team Alignment</span>
							</div>
							<div class="exec-metric">
								<span class="em-val purple">$94K</span>
								<span class="em-label">Projected TCO</span>
							</div>
							<div class="exec-metric">
								<span class="em-val green">Low</span>
								<span class="em-label">Risk Level</span>
							</div>
						</div>
						<div class="exec-recommendation">
							<div class="rec-header">
								<span class="ai-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l2.5 5L7 13 4.5 6z" fill="#00cc96" opacity="0.7"/><path d="M7 1l2.5 5L7 13 4.5 6z" stroke="#00cc96" stroke-width="1" stroke-linejoin="round"/></svg></span>
								<span>AI Recommendation</span>
							</div>
							<p><strong>Salesforce Sales Cloud</strong> is the recommended vendor based on weighted scoring (94/100), team alignment (87%), and long-term scalability. HubSpot remains a strong alternative with 22% lower TCO if budget becomes the primary constraint.</p>
						</div>
					</div>
					<div class="briefing-panel">
						<button class="briefing-trigger" onclick={toggleBriefing}>
							<div class="bt-left">
								<span class="bt-type">Milestone Briefing</span>
								<span class="bt-title">CRM Evaluation — Final Recommendation</span>
								<span class="bt-meta">Generated 2 minutes ago · AI-powered</span>
							</div>
							<span class="bt-arrow" class:open={briefingOpen}>&rsaquo;</span>
						</button>
						{#if briefingOpen}
							<div class="briefing-content fade-in">
								<div class="bc-section">
									<h5>Executive Summary</h5>
									<p>After a 90-day evaluation involving 4 stakeholders, 5 vendors, and 25 AI-powered analyses, Meridian Technologies is positioned to select Salesforce Sales Cloud as its CRM platform. Team alignment stands at 87% with one identified gap in budget perception that has been addressed through a TCO review session.</p>
								</div>
								<div class="bc-section">
									<h5>Recommended Actions</h5>
									<div class="bc-actions">
										<div class="bc-action"><span class="bca-num">1</span>Approve Salesforce as primary vendor</div>
										<div class="bc-action"><span class="bca-num">2</span>Negotiate enterprise discount (target 15-20% off list)</div>
										<div class="bc-action"><span class="bca-num">3</span>Begin implementation planning with IT</div>
									</div>
								</div>
								<div class="bc-approve-row">
									{#if briefingApproved}
										<span class="approve-success fade-in">✓ Briefing Published</span>
									{:else}
										<button class="btn-approve" onclick={() => briefingApproved = true}>Approve & Publish</button>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Nav Controls -->
	<div class="demo-nav">
		<button class="nav-btn" onclick={prevStep} disabled={currentStep === 0}>
			&larr; Previous
		</button>
		<span class="nav-indicator">Step {currentStep + 1} of {STEPS.length}</span>
		{#if currentStep === STEPS.length - 1}
			<a href="https://app.tryshortlist.app/auth/signup" class="nav-btn cta-btn">
				Start Your Evaluation &rarr;
			</a>
		{:else}
			<button class="nav-btn next-btn" onclick={nextStep}>
				Next Step &rarr;
			</button>
		{/if}
	</div>

	<!-- Bottom CTA -->
	<section class="demo-cta">
		<h2>Ready to run your own evaluation?</h2>
		<p>Start free — no credit card required. Your first project takes 5 minutes to set up.</p>
		<div class="cta-group">
			<a href="https://app.tryshortlist.app/auth/signup" class="btn-primary">
				Get Started Free
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</a>
			<a href="/pricing" class="btn-ghost">See Pricing</a>
		</div>
	</section>
</div>

<style>
	/* ═══════ PAGE ═══════ */
	.demo-page { max-width: 1100px; margin: 0 auto; padding: 48px 24px 80px; position: relative; z-index: 1; }

	/* ═══════ HERO ═══════ */
	.demo-hero { text-align: center; margin-bottom: 40px; }
	.hero-badge {
		display: inline-flex; align-items: center; gap: 8px;
		padding: 6px 18px; background: rgba(74, 150, 248, 0.06);
		border: 1px solid rgba(74, 150, 248, 0.15); border-radius: 9999px;
		font-size: 0.8125rem; font-weight: 600; color: #4a96f8; margin-bottom: 1.5rem;
	}
	.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #4a96f8; animation: pulse 2s infinite; }
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
	h1 {
		font-family: 'Playfair Display', serif; font-size: 3rem; font-weight: 800;
		color: #ffffff; margin-bottom: 1rem; line-height: 1.1; letter-spacing: -0.02em;
	}
	.highlight {
		background: linear-gradient(135deg, #00cc96, #4a96f8);
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
	}
	.hero-sub { font-size: 1.0625rem; color: #6b7e96; max-width: 600px; margin: 0 auto; line-height: 1.7; }
	.hero-sub strong { color: #dde4ef; }

	/* ═══════ ORG BAR ═══════ */
	.org-bar {
		display: flex; align-items: center; justify-content: space-between;
		background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
		border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
	}
	.org-info { display: flex; align-items: center; gap: 12px; }
	.org-avatar {
		width: 36px; height: 36px; border-radius: 10px;
		background: rgba(0,204,150,0.12); color: #00cc96;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700;
	}
	.org-name { display: block; font-size: 0.875rem; font-weight: 700; color: #fff; }
	.org-detail { display: block; font-size: 0.6875rem; color: #6b7e96; }
	.org-project { display: flex; flex-direction: column; gap: 2px; }
	.project-label { font-size: 0.5625rem; font-weight: 600; color: #6b7e96; text-transform: uppercase; letter-spacing: 0.06em; }
	.project-name { font-size: 0.8125rem; font-weight: 600; color: #dde4ef; }
	.org-team { display: flex; gap: -4px; }
	.team-avatar {
		width: 30px; height: 30px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.625rem; font-weight: 700; margin-left: -6px;
		border: 2px solid #0b1017; cursor: default;
	}
	.team-avatar:first-child { margin-left: 0; }

	/* ═══════ SOLVE PROGRESS ═══════ */
	.solve-progress {
		display: flex; align-items: center; justify-content: center;
		margin-bottom: 32px; gap: 0;
	}
	.progress-step {
		display: flex; flex-direction: column; align-items: center; gap: 6px;
		background: none; border: none; cursor: pointer; padding: 8px 12px;
	}
	.step-dot {
		width: 32px; height: 32px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700; color: #6b7e96;
		transition: all 0.25s;
	}
	.progress-step.active .step-dot { color: #0b1017; transform: scale(1.15); box-shadow: 0 0 20px color-mix(in srgb, var(--step-color) 40%, transparent); }
	.progress-step.completed .step-dot { color: transparent; }
	.step-label { font-size: 0.6875rem; font-weight: 600; color: #6b7e96; transition: color 0.2s; }
	.progress-step.active .step-label { color: #fff; }
	.progress-step.completed .step-label { color: #00cc96; }
	.progress-line { width: 48px; height: 2px; border-radius: 1px; transition: background 0.3s; margin-bottom: 20px; }

	/* ═══════ STEP CONTENT ═══════ */
	.step-content { transition: opacity 0.2s; }
	.step-content.fade-out { opacity: 0.4; }
	.step-panel { animation: fadeIn 0.35s ease-out; }
	@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
	.fade-in { animation: fadeIn 0.35s ease-out; }

	.panel-header { margin-bottom: 28px; }
	.panel-badge {
		display: inline-block; padding: 4px 14px;
		border: 1px solid; border-radius: 9999px;
		font-size: 0.6875rem; font-weight: 700;
		letter-spacing: 0.06em; margin-bottom: 12px;
	}
	.panel-header h2 {
		font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 800;
		color: #fff; margin-bottom: 8px; line-height: 1.2;
	}
	.panel-header p { font-size: 0.9375rem; color: #6b7e96; line-height: 1.65; max-width: 640px; }

	/* ═══════ SCOPE ═══════ */
	.scope-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
	.scope-form { display: flex; flex-direction: column; gap: 12px; }
	.form-group { padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
	.form-group label { display: block; font-size: 0.625rem; font-weight: 700; color: #6b7e96; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
	.form-value { font-size: 0.875rem; color: #dde4ef; font-weight: 500; }
	.team-row { display: flex; align-items: center; gap: 6px; }
	.mini-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; font-weight: 700; }
	.member-count { font-size: 0.75rem; color: #6b7e96; margin-left: 4px; }
	.form-tags { display: flex; flex-wrap: wrap; gap: 6px; }
	.tag { padding: 4px 10px; background: rgba(0,204,150,0.08); border: 1px solid rgba(0,204,150,0.15); border-radius: 6px; font-size: 0.6875rem; font-weight: 600; color: #00cc96; }

	.scope-ai-card { background: rgba(0,204,150,0.04); border: 1px solid rgba(0,204,150,0.12); border-radius: 12px; overflow: hidden; align-self: start; }
	.ai-card-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(0,204,150,0.06); font-size: 0.75rem; font-weight: 700; color: #00cc96; }
	.ai-icon { font-size: 14px; }
	.ai-card-body { padding: 16px; }
	.ai-insight-text { font-size: 0.8125rem; color: #8b95a5; line-height: 1.65; margin-bottom: 12px; }
	.ai-insight-text strong { color: #dde4ef; }
	.ai-rec { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; }
	.rec-label { display: block; font-size: 0.5625rem; font-weight: 700; color: #00cc96; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
	.rec-text { font-size: 0.8125rem; color: #8b95a5; line-height: 1.55; }

	/* ═══════ OBSERVE ═══════ */
	.discover-layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; }
	.vendor-table { display: flex; flex-direction: column; gap: 0; }
	.table-header {
		display: grid; grid-template-columns: 2fr 1.2fr 1fr 0.7fr 1.2fr;
		padding: 8px 14px; font-size: 0.625rem; font-weight: 700;
		color: #6b7e96; text-transform: uppercase; letter-spacing: 0.06em;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.vendor-table-row {
		display: grid; grid-template-columns: 2fr 1.2fr 1fr 0.7fr 1.2fr;
		align-items: center; padding: 12px 14px;
		border-bottom: 1px solid rgba(255,255,255,0.04);
		animation: slideIn 0.4s ease-out both;
	}
	@keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
	.vt-vendor { display: flex; align-items: center; gap: 10px; }
	.vt-av { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 0.625rem; font-weight: 700; flex-shrink: 0; }
	.vt-name { font-size: 0.8125rem; font-weight: 600; color: #dde4ef; }
	.vt-cat { font-size: 0.75rem; color: #6b7e96; }
	.vt-pricing { font-size: 0.75rem; color: #8b95a5; font-weight: 500; }
	.vt-risk { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
	.vt-risk.risk-low { color: #00cc96; }
	.vt-risk.risk-medium { color: #f0a034; }
	.vt-fit { display: flex; align-items: center; gap: 8px; }
	.fit-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
	.fit-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease-out; }
	.fit-num { font-size: 0.875rem; font-weight: 800; width: 28px; text-align: right; }

	.discover-sidebar { display: flex; flex-direction: column; gap: 12px; }
	.sidebar-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; }
	.sidebar-card h4 { font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 12px; font-family: 'Figtree', sans-serif; }
	.summary-stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
	.ss-label { font-size: 0.75rem; color: #6b7e96; }
	.ss-val { font-size: 0.875rem; font-weight: 800; color: #fff; }
	.ss-val.teal { color: #00cc96; }
	.ss-val.blue { color: #4a96f8; }

	.ai-trigger-btn {
		display: flex; align-items: center; justify-content: center; gap: 8px;
		width: 100%; padding: 12px; background: rgba(0,204,150,0.08);
		border: 1px solid rgba(0,204,150,0.2); border-radius: 10px;
		color: #00cc96; font-size: 0.8125rem; font-weight: 600;
		cursor: pointer; transition: all 0.2s; font-family: 'Figtree', sans-serif;
	}
	.ai-trigger-btn:hover { background: rgba(0,204,150,0.14); border-color: rgba(0,204,150,0.35); }

	.ai-insight-box { background: rgba(0,204,150,0.04); border: 1px solid rgba(0,204,150,0.12); border-radius: 10px; padding: 14px; }
	.ai-insight-header { display: flex; align-items: center; gap: 6px; font-size: 0.6875rem; font-weight: 700; color: #00cc96; margin-bottom: 8px; }
	.ai-insight-box p { font-size: 0.8125rem; color: #8b95a5; line-height: 1.6; margin: 0; }
	.ai-insight-box strong { color: #f0a034; }

	/* ═══════ LEVERAGE ═══════ */
	.leverage-layout { display: grid; grid-template-columns: 300px 1fr; gap: 24px; }
	.criteria-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; }
	.criteria-panel h4 { font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 14px; font-family: 'Figtree', sans-serif; }
	.criteria-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
	.cr-name { font-size: 0.75rem; color: #8b95a5; width: 130px; flex-shrink: 0; }
	.cr-bar-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
	.cr-bar-fill { height: 100%; background: linear-gradient(90deg, #00cc96, #4a96f8); border-radius: 2px; }
	.cr-weight { font-size: 0.75rem; font-weight: 700; color: #dde4ef; width: 32px; text-align: right; }

	.comparison-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; overflow-x: auto; }
	.comparison-panel h4 { font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 14px; font-family: 'Figtree', sans-serif; }
	.comparison-grid { display: flex; flex-direction: column; gap: 0; }
	.comp-header { display: grid; grid-template-columns: 140px repeat(3, 1fr); gap: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 4px; }
	.comp-vendor-head { display: flex; align-items: center; gap: 6px; }
	.comp-av { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.5625rem; font-weight: 700; }
	.comp-name { font-size: 0.6875rem; font-weight: 600; color: #dde4ef; }
	.comp-row { display: grid; grid-template-columns: 140px repeat(3, 1fr); gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
	.comp-criteria { font-size: 0.6875rem; color: #6b7e96; }
	.comp-cell { display: flex; align-items: center; gap: 6px; }
	.comp-bar { height: 4px; border-radius: 2px; }
	.comp-score { font-size: 0.6875rem; font-weight: 700; color: #8b95a5; }

	/* ═══════ VALIDATE ═══════ */
	.validate-layout { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
	.alignment-panel { display: flex; flex-direction: column; gap: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; }
	.alignment-ring-container { display: flex; justify-content: center; position: relative; }
	.alignment-ring { width: 120px; height: 120px; }
	.ring-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
	.ring-number { display: block; font-size: 1.75rem; font-weight: 800; color: #00cc96; line-height: 1; }
	.ring-label { font-size: 0.625rem; font-weight: 600; color: #6b7e96; text-transform: uppercase; letter-spacing: 0.06em; }
	.role-breakdown h4 { font-size: 0.75rem; font-weight: 700; color: #fff; margin-bottom: 10px; font-family: 'Figtree', sans-serif; }
	.role-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
	.role-name { font-size: 0.6875rem; color: #8b95a5; width: 90px; flex-shrink: 0; }
	.role-bar-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
	.role-bar-fill { height: 100%; border-radius: 2px; }
	.role-score { font-size: 0.75rem; font-weight: 700; width: 24px; text-align: right; }

	.poll-panel { display: flex; flex-direction: column; gap: 12px; }
	.poll-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; }
	.poll-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
	.poll-type { font-size: 0.625rem; font-weight: 700; color: #4a96f8; text-transform: uppercase; letter-spacing: 0.06em; }
	.poll-status { font-size: 0.5625rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.04em; }
	.poll-status.active { background: rgba(0,204,150,0.1); color: #00cc96; }
	.poll-card h4 { font-size: 0.875rem; font-weight: 600; color: #dde4ef; margin-bottom: 12px; font-family: 'Figtree', sans-serif; font-style: italic; }
	.poll-options { display: flex; flex-direction: column; gap: 6px; }
	.poll-option {
		display: flex; align-items: center; gap: 10px;
		padding: 10px 12px; background: rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
		cursor: pointer; transition: all 0.15s; font-family: 'Figtree', sans-serif;
		color: #8b95a5;
	}
	.poll-option:hover { border-color: rgba(255,255,255,0.14); }
	.poll-option.selected { border-color: rgba(0,204,150,0.3); background: rgba(0,204,150,0.04); }
	.po-radio { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.12); flex-shrink: 0; }
	.po-radio.filled { border-color: #00cc96; background: #00cc96; }
	.po-label { font-size: 0.8125rem; flex: 1; }
	.po-pct { font-size: 0.8125rem; font-weight: 700; color: #dde4ef; }
	.poll-result { padding-top: 8px; }
	.poll-voters { font-size: 0.6875rem; color: #00cc96; font-weight: 600; }

	.gap-alert {
		display: flex; gap: 12px; padding: 14px;
		background: rgba(240,160,52,0.06); border: 1px solid rgba(240,160,52,0.15);
		border-radius: 10px;
	}
	.gap-icon {
		width: 28px; height: 28px; border-radius: 50%;
		background: rgba(240,160,52,0.12); color: #f0a034;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
	}
	.gap-title { display: block; font-size: 0.75rem; font-weight: 700; color: #f0a034; margin-bottom: 4px; }
	.gap-content p { font-size: 0.75rem; color: #8b95a5; line-height: 1.5; margin: 0; }

	/* ═══════ EXECUTE ═══════ */
	.execute-layout { display: flex; flex-direction: column; gap: 20px; }
	.exec-dashboard { display: flex; flex-direction: column; gap: 16px; }
	.exec-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
	.exec-metric { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; }
	.em-val { display: block; font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 4px; }
	.em-val.teal { color: #00cc96; }
	.em-val.blue { color: #4a96f8; }
	.em-val.purple { color: #a06cf0; }
	.em-val.green { color: #00cc96; }
	.em-label { font-size: 0.6875rem; color: #6b7e96; font-weight: 500; }

	.exec-recommendation {
		background: rgba(0,204,150,0.04); border: 1px solid rgba(0,204,150,0.12);
		border-radius: 10px; padding: 16px;
	}
	.rec-header { display: flex; align-items: center; gap: 6px; font-size: 0.6875rem; font-weight: 700; color: #00cc96; margin-bottom: 8px; }
	.exec-recommendation p { font-size: 0.875rem; color: #8b95a5; line-height: 1.65; margin: 0; }
	.exec-recommendation strong { color: #dde4ef; }

	.briefing-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; }
	.briefing-trigger {
		display: flex; align-items: center; justify-content: space-between;
		width: 100%; padding: 16px; background: none; border: none; cursor: pointer;
		font-family: 'Figtree', sans-serif; text-align: left;
	}
	.bt-left { display: flex; flex-direction: column; gap: 2px; }
	.bt-type { font-size: 0.5625rem; font-weight: 700; color: #a06cf0; text-transform: uppercase; letter-spacing: 0.06em; }
	.bt-title { font-size: 0.9375rem; font-weight: 600; color: #dde4ef; }
	.bt-meta { font-size: 0.6875rem; color: #6b7e96; }
	.bt-arrow { font-size: 1.25rem; color: #6b7e96; transition: transform 0.2s; }
	.bt-arrow.open { transform: rotate(90deg); }

	.briefing-content { padding: 0 16px 16px; border-top: 1px solid rgba(255,255,255,0.06); }
	.bc-section { padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
	.bc-section h5 { font-size: 0.6875rem; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; font-family: 'Figtree', sans-serif; }
	.bc-section p { font-size: 0.8125rem; color: #8b95a5; line-height: 1.65; margin: 0; }
	.bc-actions { display: flex; flex-direction: column; gap: 6px; }
	.bc-action { display: flex; align-items: center; gap: 10px; font-size: 0.8125rem; color: #8b95a5; padding: 8px 0; }
	.bca-num {
		width: 22px; height: 22px; border-radius: 6px;
		background: rgba(0,204,150,0.1); color: #00cc96;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.625rem; font-weight: 700; flex-shrink: 0;
	}
	.bc-approve-row { padding: 14px 0 0; display: flex; justify-content: flex-end; }
	.btn-approve {
		padding: 10px 24px; background: #00cc96; color: #061510;
		border: none; border-radius: 8px; font-size: 0.8125rem;
		font-weight: 700; cursor: pointer; font-family: 'Figtree', sans-serif;
		transition: opacity 0.15s;
	}
	.btn-approve:hover { opacity: 0.9; }
	.approve-success { font-size: 0.8125rem; font-weight: 700; color: #00cc96; padding: 10px 24px; background: rgba(0,204,150,0.08); border: 1px solid rgba(0,204,150,0.2); border-radius: 8px; }

	/* ═══════ DEMO NAV ═══════ */
	.demo-nav {
		display: flex; align-items: center; justify-content: space-between;
		margin-top: 32px; padding-top: 24px;
		border-top: 1px solid rgba(255,255,255,0.06);
	}
	.nav-btn {
		padding: 10px 20px; background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
		color: #8b95a5; font-size: 0.8125rem; font-weight: 600;
		cursor: pointer; transition: all 0.15s; font-family: 'Figtree', sans-serif;
		text-decoration: none;
	}
	.nav-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); color: #dde4ef; }
	.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
	.nav-btn.next-btn { background: rgba(0,204,150,0.08); border-color: rgba(0,204,150,0.2); color: #00cc96; }
	.nav-btn.next-btn:hover { background: rgba(0,204,150,0.14); }
	.nav-btn.cta-btn { background: #00cc96; border-color: #00cc96; color: #061510; font-weight: 700; }
	.nav-btn.cta-btn:hover { opacity: 0.9; }
	.nav-indicator { font-size: 0.75rem; color: #6b7e96; font-weight: 500; }

	/* ═══════ BOTTOM CTA ═══════ */
	.demo-cta { text-align: center; padding: 60px 0 0; margin-top: 48px; border-top: 1px solid rgba(255,255,255,0.04); }
	.demo-cta h2 { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 8px; }
	.demo-cta p { font-size: 1rem; color: #6b7e96; margin-bottom: 2rem; }
	.cta-group { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
	.btn-primary {
		display: inline-flex; align-items: center; gap: 8px;
		padding: 14px 32px; background: #00cc96; color: #061510;
		border-radius: 10px; font-weight: 700; font-size: 1rem;
		text-decoration: none; transition: all 0.17s; font-family: 'Figtree', sans-serif;
	}
	.btn-primary:hover { background: #009e74; transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0, 204, 150, 0.22); }
	.btn-ghost {
		display: inline-flex; align-items: center;
		padding: 14px 32px; background: transparent; color: #dde4ef;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px; font-weight: 600; font-size: 1rem;
		text-decoration: none; transition: all 0.17s; font-family: 'Figtree', sans-serif;
	}
	.btn-ghost:hover { border-color: rgba(255, 255, 255, 0.28); }

	/* ═══════ RESPONSIVE ═══════ */
	@media (max-width: 768px) {
		h1 { font-size: 2.25rem; }
		.scope-layout { grid-template-columns: 1fr; }
		.discover-layout { grid-template-columns: 1fr; }
		.leverage-layout { grid-template-columns: 1fr; }
		.validate-layout { grid-template-columns: 1fr; }
		.exec-metrics { grid-template-columns: repeat(2, 1fr); }
		.vendor-table-row, .table-header { grid-template-columns: 1.5fr 1fr 1fr; }
		.th-risk, .th-cat, .vt-risk, .vt-cat { display: none; }
		.solve-progress { flex-wrap: wrap; gap: 4px; }
		.progress-line { width: 20px; }
	}
	@media (max-width: 480px) {
		h1 { font-size: 1.875rem; }
		.exec-metrics { grid-template-columns: 1fr; }
		.comp-header, .comp-row { grid-template-columns: 100px repeat(3, 1fr); }
	}
</style>
