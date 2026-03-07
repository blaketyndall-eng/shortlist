<svelte:head>
	<title>Features — Shortlist Purchase Intelligence Platform</title>
	<meta name="description" content="SCOPE diagnostic workflow, SOLVE evaluation framework, 30 AI engines, team alignment, executive dashboards, and 100+ pre-loaded vendors. Everything you need to make confident purchase decisions." />
</svelte:head>

<section class="hero">
	<div class="hero-inner">
		<div class="hero-badge"><span class="badge-dot"></span> Platform Features</div>
		<h1>Everything you need to make <span class="highlight">confident purchases</span></h1>
		<p class="hero-sub">Most teams jump to vendor evaluation before confirming whether a purchase is the right path. Shortlist starts earlier — with diagnosis — and carries you through to a confident decision.</p>
	</div>
</section>

<!-- ═══════ FEATURE 0: SCOPE DIAGNOSTIC ═══════ -->
<section class="feature-row">
	<div class="feature-inner">
		<div class="feature-text">
			<div class="f-tag amber">Pre-Purchase Diagnostic</div>
			<h2>SCOPE Diagnostic Workflow</h2>
			<p>Before you evaluate vendors, confirm you're solving the right problem. SCOPE guides teams from purchase trigger through root cause analysis, approach selection, readiness assessment, and stakeholder endorsement — so you never spend months evaluating software you didn't need to buy.</p>
			<ul class="feature-list">
				<li>AI-powered root cause analysis from your signal data</li>
				<li>Buy / Build / Fix / Partner / Do Nothing recommendations</li>
				<li>Team alignment polls at Cause and Options stages</li>
				<li>Readiness scoring with gap and blocker detection</li>
				<li>Executive decision brief with approval workflow</li>
			</ul>
			<a href="/demo" class="inline-demo-link">Walk through the SCOPE workflow →</a>
		</div>
		<div class="feature-visual">
			<div class="solve-visual">
				{#each [
					{ letter: 'S', label: 'Signal', desc: 'Capture the purchase trigger', status: 'complete' },
					{ letter: 'C', label: 'Cause', desc: 'AI root cause analysis', status: 'complete' },
					{ letter: 'O', label: 'Options', desc: 'Buy, build, fix, or do nothing', status: 'active' },
					{ letter: 'P', label: 'Prepare', desc: 'Budget, timeline, readiness', status: 'pending' },
					{ letter: 'E', label: 'Endorse', desc: 'Executive brief & approval', status: 'pending' }
				] as step}
					<div class="solve-card scope-accent {step.status}">
						<span class="solve-letter scope-letter">{step.letter}</span>
						<div class="solve-text">
							<span class="solve-label">{step.label}</span>
							<span class="solve-desc">{step.desc}</span>
						</div>
						<span class="solve-status">{step.status === 'complete' ? '✓' : step.status === 'active' ? '●' : '○'}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 1: SOLVE WORKFLOW ═══════ -->
<section class="feature-row alt">
	<div class="feature-inner reverse">
		<div class="feature-text">
			<div class="f-tag teal">Scope → Execute</div>
			<h2>SOLVE Evaluation Workflow</h2>
			<p>Once SCOPE confirms you should buy, SOLVE takes over. The 5-step workflow guides your team from requirements through vendor discovery, weighted comparison, team validation, and confident execution — with SCOPE data already imported.</p>
			<ul class="feature-list">
				<li>AI classifies your purchase category automatically</li>
				<li>Generates knockout criteria and challenge questions</li>
				<li>Team alignment polls embedded at every stage</li>
				<li>Executive briefings auto-generated at milestones</li>
			</ul>
			<a href="/demo" class="inline-demo-link">Walk through the SOLVE workflow →</a>
		</div>
		<div class="feature-visual">
			<div class="solve-visual">
				{#each [
					{ letter: 'S', label: 'Scope', desc: 'Define triggers & stakeholders', status: 'complete' },
					{ letter: 'O', label: 'Observe', desc: 'AI vendor discovery', status: 'complete' },
					{ letter: 'L', label: 'Leverage', desc: 'Weighted scoring & comparison', status: 'active' },
					{ letter: 'V', label: 'Validate', desc: 'Demo evaluation & tracking', status: 'pending' },
					{ letter: 'E', label: 'Execute', desc: 'Reports & negotiation', status: 'pending' }
				] as step}
					<div class="solve-card {step.status}">
						<span class="solve-letter">{step.letter}</span>
						<div class="solve-text">
							<span class="solve-label">{step.label}</span>
							<span class="solve-desc">{step.desc}</span>
						</div>
						<span class="solve-status">{step.status === 'complete' ? '✓' : step.status === 'active' ? '●' : '○'}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 2: 30 AI ENGINES ═══════ -->
<section class="feature-row">
	<div class="feature-inner">
		<div class="feature-text">
			<div class="f-tag">All Phases</div>
			<h2>30 Specialized AI Engines</h2>
			<p>Each engine is purpose-built for a specific purchase intelligence task — from pre-purchase diagnostics and root cause analysis to vendor evaluation, contract risk, negotiation coaching, alignment analysis, and executive briefings.</p>
			<ul class="feature-list">
				<li>Three depth levels: quick, standard, deep analysis</li>
				<li>Company-profile-aware context for every prompt</li>
				<li>Outputs structured data, not generic text</li>
				<li>Intelligence Web connects all engines together</li>
			</ul>
		</div>
		<div class="feature-visual">
			<div class="engine-grid">
				<div class="engine-card primary"><span class="e-icon">🔍</span><span class="e-name">Evaluate</span></div>
				<div class="engine-card primary"><span class="e-icon">🌐</span><span class="e-name">Discovery</span></div>
				<div class="engine-card primary"><span class="e-icon">⚠️</span><span class="e-name">Risk Analysis</span></div>
				<div class="engine-card primary"><span class="e-icon">💰</span><span class="e-name">TCO Estimate</span></div>
			</div>
			<div class="engine-chips">
				<span class="e-chip t">Alignment Analyze</span>
				<span class="e-chip bl">Executive Insight</span>
				<span class="e-chip">Negotiate</span>
				<span class="e-chip bl">Milestone Brief</span>
				<span class="e-chip">Contract Risk</span>
				<span class="e-chip t">Alignment Summary</span>
				<span class="e-chip">Demo Debrief</span>
				<span class="e-chip">Hidden Cost</span>
				<span class="e-chip bl">Score Anomaly</span>
				<span class="e-chip">RFP</span>
				<span class="e-chip t">Fit Score</span>
				<span class="e-chip">Company Profile</span>
			</div>
			<div class="engine-count">30 Engine Types Available</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 3: TEAM ALIGNMENT ═══════ -->
<section class="feature-row alt">
	<div class="feature-inner reverse">
		<div class="feature-text">
			<div class="f-tag teal">Validate Phase</div>
			<h2>AI Team Alignment</h2>
			<p>Know whether your team is aligned before you commit. AI-powered polls with role-based scoring detect misalignment across dimensions — and recommend how to close the gaps.</p>
			<ul class="feature-list">
				<li>Likert, ranking, multiple choice, and yes/no poll types</li>
				<li>Scores broken down by role (admin, member, leadership)</li>
				<li>Gap detection: flags where stakeholders disagree</li>
				<li>AI recommendations to resolve alignment gaps</li>
				<li>Embedded in SCOPE and SOLVE stages + standalone dashboard</li>
			</ul>
			<a href="/demo" class="inline-demo-link">See alignment scoring in action →</a>
		</div>
		<div class="feature-visual">
			<div class="alignment-visual">
				<div class="align-score-ring">
					<svg width="120" height="120" viewBox="0 0 120 120">
						<circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
						<circle cx="60" cy="60" r="52" fill="none" stroke="#00cc96" stroke-width="8" stroke-dasharray="326.7" stroke-dashoffset="42.5" stroke-linecap="round" transform="rotate(-90 60 60)"/>
					</svg>
					<span class="align-score-val">87</span>
					<span class="align-score-label">Alignment</span>
				</div>
				<div class="align-roles">
					<div class="role-row"><span class="role-name">Leadership</span><div class="role-bar"><div class="role-fill" style="width:92%"></div></div><span class="role-val">92</span></div>
					<div class="role-row"><span class="role-name">Engineering</span><div class="role-bar"><div class="role-fill bl" style="width:84%"></div></div><span class="role-val">84</span></div>
					<div class="role-row"><span class="role-name">Operations</span><div class="role-bar"><div class="role-fill" style="width:88%"></div></div><span class="role-val">88</span></div>
				</div>
				<div class="align-gap">
					<span class="gap-icon">⚡</span>
					<span class="gap-text">Gap detected: Pricing priority (spread: 24)</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 4: EXECUTIVE DASHBOARD ═══════ -->
<section class="feature-row">
	<div class="feature-inner">
		<div class="feature-text">
			<div class="f-tag">Execute Phase</div>
			<h2>Executive Dashboard & Briefings</h2>
			<p>Leadership gets real-time visibility without attending meetings. AI auto-generates milestone briefings, risk alerts surface automatically, and the dashboard shows health across every active purchase.</p>
			<ul class="feature-list">
				<li>Project health cards with risk levels and alignment scores</li>
				<li>AI-generated briefings at stage completions and milestones</li>
				<li>Automatic risk alerts when alignment drops below threshold</li>
				<li>Briefing approval workflow for leadership sign-off</li>
				<li>Role-gated: only leadership and admin roles see it</li>
			</ul>
			<a href="/demo" class="inline-demo-link">Preview executive briefings →</a>
		</div>
		<div class="feature-visual">
			<div class="exec-visual">
				<div class="exec-metrics">
					<div class="exec-metric"><span class="em-val">5</span><span class="em-label">Active</span></div>
					<div class="exec-metric"><span class="em-val t">87</span><span class="em-label">Alignment</span></div>
					<div class="exec-metric"><span class="em-val bl">12</span><span class="em-label">Vendors</span></div>
					<div class="exec-metric"><span class="em-val rd">1</span><span class="em-label">Risk Alert</span></div>
				</div>
				<div class="exec-briefing">
					<div class="brief-header">
						<span class="brief-type">Milestone</span>
						<span class="brief-status">Draft</span>
					</div>
					<span class="brief-title">CRM Evaluation: Discovery Phase Complete</span>
					<span class="brief-summary">8 vendors evaluated, top 3 shortlisted. Team alignment at 87%. Budget on track.</span>
					<div class="brief-actions"><span class="brief-btn">Approve & Publish</span></div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 5: VENDOR LIBRARY ═══════ -->
<section class="feature-row alt">
	<div class="feature-inner reverse">
		<div class="feature-text">
			<div class="f-tag teal">Observe Phase</div>
			<h2>Pre-Built Vendor Library</h2>
			<p>Over 100 vendors across CRM, HR, Cloud, Analytics, Security, DevOps, and more — pre-enriched with pricing tiers, key features, company size, and industry focus. Start comparing on day one.</p>
			<ul class="feature-list">
				<li>AI enrichment with real-time company data</li>
				<li>Category filtering and search across all vendors</li>
				<li>One-click add to any project evaluation</li>
				<li>Fit scores personalized to your company profile</li>
			</ul>
		</div>
		<div class="feature-visual">
			<div class="library-visual">
				<div class="lib-categories">
					<span class="lib-cat active">CRM</span><span class="lib-cat">HR & People</span><span class="lib-cat">Cloud</span><span class="lib-cat">Analytics</span><span class="lib-cat">Security</span><span class="lib-cat">DevOps</span>
				</div>
				<div class="lib-vendors">
					<div class="lib-row"><div class="lib-av t-bg">SF</div><span class="lib-name">Salesforce</span><span class="lib-cat-tag">CRM</span><span class="lib-fit t">94 fit</span></div>
					<div class="lib-row"><div class="lib-av bl-bg">HS</div><span class="lib-name">HubSpot</span><span class="lib-cat-tag">CRM</span><span class="lib-fit bl">88 fit</span></div>
					<div class="lib-row"><div class="lib-av pu-bg">DY</div><span class="lib-name">Dynamics 365</span><span class="lib-cat-tag">CRM</span><span class="lib-fit pu">82 fit</span></div>
					<div class="lib-row"><div class="lib-av am-bg">PD</div><span class="lib-name">Pipedrive</span><span class="lib-cat-tag">CRM</span><span class="lib-fit">76 fit</span></div>
				</div>
				<span class="lib-count">+96 more vendors</span>
			</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 6: SCORING ═══════ -->
<section class="feature-row">
	<div class="feature-inner">
		<div class="feature-text">
			<div class="f-tag">Leverage Phase</div>
			<h2>Weighted Scoring & Comparison</h2>
			<p>Define custom criteria with configurable weights, get AI-assisted scores with confidence levels, and compare vendors side-by-side with automated reports and TCO analysis.</p>
			<ul class="feature-list">
				<li>Custom criteria with 0-10 weight configuration</li>
				<li>AI-generated fit scores based on company profile</li>
				<li>Side-by-side comparison with automated insights</li>
				<li>Sensitivity analysis and what-if scenarios</li>
			</ul>
		</div>
		<div class="feature-visual">
			<div class="scoring-visual">
				<div class="score-row"><span class="sc-label">Security</span><div class="sc-track"><div class="sc-fill t" style="width:92%"></div></div><span class="sc-val">92</span></div>
				<div class="score-row"><span class="sc-label">Price</span><div class="sc-track"><div class="sc-fill bl" style="width:78%"></div></div><span class="sc-val">78</span></div>
				<div class="score-row"><span class="sc-label">Support</span><div class="sc-track"><div class="sc-fill t" style="width:85%"></div></div><span class="sc-val">85</span></div>
				<div class="score-row"><span class="sc-label">Integration</span><div class="sc-track"><div class="sc-fill bl" style="width:90%"></div></div><span class="sc-val">90</span></div>
				<div class="score-row"><span class="sc-label">Scalability</span><div class="sc-track"><div class="sc-fill t" style="width:88%"></div></div><span class="sc-val">88</span></div>
			</div>
		</div>
	</div>
</section>

<!-- ═══════ FEATURE 7: INTELLIGENCE WEB ═══════ -->
<section class="feature-row alt">
	<div class="feature-inner reverse">
		<div class="feature-text">
			<div class="f-tag teal">All Phases</div>
			<h2>The Intelligence Web</h2>
			<p>All AI features work together as one connected system. Vendor enrichment feeds into scoring, scoring feeds into alignment, alignment triggers executive briefings. Every action generates intelligence that makes the next decision smarter.</p>
			<ul class="feature-list">
				<li>Enrichment → Fit Scoring → Alignment → Executive Insights</li>
				<li>Auto-triggers on stage completions and vendor changes</li>
				<li>Risk alerts fire when alignment drops below threshold</li>
				<li>Cross-reference insights across all project data</li>
			</ul>
		</div>
		<div class="feature-visual">
			<div class="web-visual">
				<div class="web-node center">Intelligence Web</div>
				<div class="web-connections">
					<div class="web-node-sm t">Enrichment</div>
					<div class="web-node-sm bl">Fit Scoring</div>
					<div class="web-node-sm t">Alignment</div>
					<div class="web-node-sm pu">Executive</div>
				</div>
				<div class="web-flow"><span class="web-arrow">→</span> Vendor data flows through AI engines automatically</div>
			</div>
		</div>
	</div>
</section>

<!-- ═══════ CTA ═══════ -->
<section class="final-cta">
	<div class="section-inner">
		<h2>See these features in action</h2>
		<p>Walk through a live SCOPE diagnostic and CRM evaluation using every feature on this page — or start your own project today.</p>
		<div class="cta-group">
			<a href="/demo" class="btn-primary">Try the Interactive Demo <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
			<a href="https://app.tryshortlist.app/auth/signup" class="btn-ghost">Start Free Trial</a>
		</div>
	</div>
</section>

<style>
	section { padding: 5rem 2rem; }
	.section-inner { max-width: 1080px; margin: 0 auto; }
	h2 { font-family: 'Playfair Display', serif; font-size: 2.25rem; font-weight: 800; color: #fff; line-height: 1.15; margin: 0 0 1rem; }
	.hero { padding: 3rem 2rem 2rem; text-align: center; }
	.hero-inner { max-width: 720px; margin: 0 auto; }
	.hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; background: rgba(0,204,150,0.06); border: 1px solid rgba(0,204,150,0.15); border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; color: #00cc96; margin-bottom: 2rem; }
	.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #00cc96; animation: pulse 2s infinite; }
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
	h1 { font-family: 'Playfair Display', serif; font-size: 3.25rem; font-weight: 800; line-height: 1.1; margin-bottom: 1.5rem; color: #fff; }
	.highlight { background: linear-gradient(135deg, #00cc96, #4a96f8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
	.hero-sub { font-size: 1.125rem; color: #6b7e96; line-height: 1.7; max-width: 600px; margin: 0 auto; }
	.feature-row { padding: 4rem 2rem; }
	.feature-row.alt { background: rgba(255,255,255,0.01); }
	.feature-inner { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
	.feature-inner.reverse { direction: rtl; }
	.feature-inner.reverse > * { direction: ltr; }
	.f-tag { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 1rem; background: rgba(240,80,80,0.08); border: 1px solid rgba(240,80,80,0.16); color: #f05050; }
	.f-tag.teal { background: rgba(0,204,150,0.08); border-color: rgba(0,204,150,0.16); color: #00cc96; }
	.f-tag.amber { background: rgba(240,160,52,0.08); border-color: rgba(240,160,52,0.16); color: #f0a034; }
	.scope-accent.complete { border-color: rgba(240,160,52,0.2); }
	.scope-accent.active { border-color: rgba(240,160,52,0.3); background: rgba(240,160,52,0.04); }
	.scope-letter { background: rgba(240,160,52,0.12) !important; color: #f0a034 !important; }
	.scope-accent.complete .solve-letter { background: rgba(240,160,52,0.12); color: #f0a034; }
	.scope-accent.active .solve-letter { background: rgba(240,160,52,0.18); color: #f0a034; }
	.scope-accent.complete .solve-status { color: #f0a034; }
	.scope-accent.active .solve-status { color: #f0a034; }
	.feature-text p { font-size: 1rem; color: #6b7e96; line-height: 1.7; margin: 0 0 1.25rem; }
	.feature-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
	.feature-list li { font-size: 0.875rem; color: #8b95a5; padding-left: 20px; position: relative; line-height: 1.6; }
	.feature-list li::before { content: '✓'; position: absolute; left: 0; color: #00cc96; font-weight: 700; font-size: 0.75rem; }
	.solve-visual { display: flex; flex-direction: column; gap: 8px; }
	.solve-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
	.solve-card.complete { border-color: rgba(0,204,150,0.2); }
	.solve-card.active { border-color: rgba(74,150,248,0.3); background: rgba(74,150,248,0.04); }
	.solve-letter { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; background: rgba(255,255,255,0.04); color: #6b7e96; flex-shrink: 0; }
	.solve-card.complete .solve-letter { background: rgba(0,204,150,0.12); color: #00cc96; }
	.solve-card.active .solve-letter { background: rgba(74,150,248,0.12); color: #4a96f8; }
	.solve-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.solve-label { font-size: 0.8125rem; font-weight: 600; color: #dde4ef; }
	.solve-desc { font-size: 0.6875rem; color: #6b7e96; }
	.solve-status { font-size: 0.75rem; flex-shrink: 0; }
	.solve-card.complete .solve-status { color: #00cc96; }
	.solve-card.active .solve-status { color: #4a96f8; }
	.engine-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
	.engine-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
	.engine-card.primary { border-color: rgba(0,204,150,0.15); }
	.e-icon { font-size: 1.25rem; }
	.e-name { font-size: 0.75rem; font-weight: 600; color: #dde4ef; }
	.engine-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
	.e-chip { padding: 4px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; font-size: 0.625rem; font-weight: 600; color: #6b7e96; }
	.e-chip.t { color: #00cc96; border-color: rgba(0,204,150,0.2); }
	.e-chip.bl { color: #4a96f8; border-color: rgba(74,150,248,0.2); }
	.engine-count { font-size: 0.75rem; font-weight: 700; color: #00cc96; text-align: center; }
	.alignment-visual { display: flex; flex-direction: column; align-items: center; gap: 20px; }
	.align-score-ring { position: relative; width: 120px; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
	.align-score-ring svg { position: absolute; inset: 0; }
	.align-score-val { font-size: 2rem; font-weight: 800; color: #00cc96; z-index: 1; line-height: 1; }
	.align-score-label { font-size: 0.625rem; font-weight: 600; color: #6b7e96; z-index: 1; text-transform: uppercase; letter-spacing: 0.04em; }
	.align-roles { width: 100%; max-width: 300px; display: flex; flex-direction: column; gap: 8px; }
	.role-row { display: flex; align-items: center; gap: 10px; }
	.role-name { font-size: 0.75rem; color: #6b7e96; width: 80px; flex-shrink: 0; }
	.role-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
	.role-fill { height: 100%; border-radius: 2px; background: #00cc96; }
	.role-fill.bl { background: #4a96f8; }
	.role-val { font-size: 0.75rem; font-weight: 700; color: #dde4ef; width: 24px; text-align: right; }
	.align-gap { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(240,160,52,0.08); border: 1px solid rgba(240,160,52,0.2); border-radius: 8px; width: 100%; max-width: 300px; }
	.gap-icon { font-size: 0.875rem; }
	.gap-text { font-size: 0.6875rem; color: #f0a034; font-weight: 600; }
	.exec-visual { display: flex; flex-direction: column; gap: 16px; }
	.exec-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
	.exec-metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
	.em-val { font-size: 1.25rem; font-weight: 800; color: #fff; }
	.em-val.t { color: #00cc96; } .em-val.bl { color: #4a96f8; } .em-val.rd { color: #f05050; }
	.em-label { font-size: 0.5625rem; color: #6b7e96; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
	.exec-briefing { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
	.brief-header { display: flex; justify-content: space-between; }
	.brief-type { font-size: 0.5625rem; font-weight: 700; color: #4a96f8; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; background: rgba(74,150,248,0.1); border-radius: 9999px; }
	.brief-status { font-size: 0.5625rem; font-weight: 700; color: #f0a034; text-transform: uppercase; letter-spacing: 0.06em; }
	.brief-title { font-size: 0.875rem; font-weight: 700; color: #dde4ef; }
	.brief-summary { font-size: 0.75rem; color: #6b7e96; line-height: 1.5; }
	.brief-actions { display: flex; gap: 8px; margin-top: 4px; }
	.brief-btn { padding: 6px 14px; background: #00cc96; color: #061510; border-radius: 6px; font-size: 0.6875rem; font-weight: 700; }
	.library-visual { display: flex; flex-direction: column; gap: 12px; }
	.lib-categories { display: flex; flex-wrap: wrap; gap: 6px; }
	.lib-cat { padding: 4px 12px; border-radius: 6px; font-size: 0.6875rem; font-weight: 600; color: #6b7e96; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
	.lib-cat.active { color: #00cc96; border-color: rgba(0,204,150,0.3); background: rgba(0,204,150,0.06); }
	.lib-vendors { display: flex; flex-direction: column; gap: 6px; }
	.lib-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
	.lib-av { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.5625rem; font-weight: 700; flex-shrink: 0; }
	.t-bg { background: rgba(0,204,150,0.14); color: #00cc96; }
	.bl-bg { background: rgba(74,150,248,0.14); color: #4a96f8; }
	.pu-bg { background: rgba(160,108,240,0.14); color: #a06cf0; }
	.am-bg { background: rgba(240,160,52,0.14); color: #f0a034; }
	.lib-name { font-size: 0.8125rem; font-weight: 600; color: #dde4ef; flex: 1; }
	.lib-cat-tag { font-size: 0.5625rem; color: #3a4a5c; font-weight: 500; }
	.lib-fit { font-size: 0.75rem; font-weight: 700; color: #6b7e96; }
	.lib-fit.t { color: #00cc96; } .lib-fit.bl { color: #4a96f8; } .lib-fit.pu { color: #a06cf0; }
	.lib-count { font-size: 0.75rem; color: #3a4a5c; font-weight: 600; text-align: center; }
	.scoring-visual { display: flex; flex-direction: column; gap: 14px; }
	.score-row { display: flex; align-items: center; gap: 12px; }
	.sc-label { font-size: 0.75rem; color: #6b7e96; width: 72px; flex-shrink: 0; font-weight: 500; }
	.sc-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
	.sc-fill { height: 100%; border-radius: 3px; }
	.sc-fill.t { background: #00cc96; } .sc-fill.bl { background: #4a96f8; }
	.sc-val { font-size: 0.8125rem; font-weight: 700; color: #dde4ef; width: 28px; text-align: right; }
	.web-visual { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 24px; }
	.web-node.center { padding: 14px 28px; background: rgba(0,204,150,0.08); border: 1px solid rgba(0,204,150,0.2); border-radius: 12px; font-size: 0.875rem; font-weight: 700; color: #00cc96; }
	.web-connections { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; }
	.web-node-sm { padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 0.6875rem; font-weight: 600; color: #6b7e96; text-align: center; }
	.web-node-sm.t { color: #00cc96; border-color: rgba(0,204,150,0.2); }
	.web-node-sm.bl { color: #4a96f8; border-color: rgba(74,150,248,0.2); }
	.web-node-sm.pu { color: #a06cf0; border-color: rgba(160,108,240,0.2); }
	.web-flow { font-size: 0.75rem; color: #6b7e96; text-align: center; }
	.web-arrow { color: #00cc96; font-weight: 700; }
	.final-cta { text-align: center; padding: 5rem 2rem 6rem; border-top: 1px solid rgba(255,255,255,0.04); }
	.final-cta h2 { margin-bottom: 0.75rem; }
	.final-cta p { font-size: 1.125rem; color: #6b7e96; margin-bottom: 2rem; }
	.cta-group { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
	.btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: #00cc96; color: #061510; border-radius: 10px; font-weight: 700; font-size: 1rem; text-decoration: none; transition: all 0.17s; }
	.btn-primary:hover { background: #009e74; transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,204,150,0.22); text-decoration: none; }
	.btn-ghost { display: inline-flex; align-items: center; padding: 14px 32px; background: transparent; color: #dde4ef; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; font-weight: 600; font-size: 1rem; text-decoration: none; transition: all 0.17s; }
	.btn-ghost:hover { border-color: rgba(255,255,255,0.28); text-decoration: none; }
	.inline-demo-link { display: inline-block; margin-top: 1rem; font-size: 0.875rem; font-weight: 600; color: #00cc96; text-decoration: none; transition: color 0.15s; }
	.inline-demo-link:hover { color: #4a96f8; text-decoration: none; }
	@media (max-width: 768px) {
		h1 { font-size: 2.25rem; }
		h2 { font-size: 1.75rem; }
		.feature-inner, .feature-inner.reverse { grid-template-columns: 1fr; gap: 2rem; direction: ltr; }
		.exec-metrics { grid-template-columns: repeat(2, 1fr); }
		.engine-grid { grid-template-columns: repeat(2, 1fr); }
		.web-connections { grid-template-columns: repeat(2, 1fr); }
	}
</style>
