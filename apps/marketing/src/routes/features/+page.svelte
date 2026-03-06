<svelte:head>
	<title>Features — Shortlist</title>
	<meta name="description" content="AI-powered vendor evaluation, team collaboration, and procurement intelligence." />
</svelte:head>

<div class="features-page">
	<header class="hero">
		<h1>Everything you need to make better vendor decisions</h1>
		<p>From initial discovery to final recommendation — Shortlist guides every step.</p>
	</header>

	<section class="feature-section">
		<div class="feature-block">
			<div class="feature-content">
				<span class="feature-tag">AI-Powered</span>
				<h2>8 specialized AI engines</h2>
				<p>Each engine is purpose-built for a specific procurement task: Evaluate vendors, Discover new options, generate RFPs, Negotiate terms, assess Risk, produce Executive summaries, plan Implementations, and monitor Vendor performance.</p>
				<p>Choose your depth — quick (seconds), standard (thorough), or deep (comprehensive) — and get analysis with confidence scores you can trust.</p>
			</div>
			<div class="feature-visual">
				<div class="engine-grid">
					<span class="engine-chip">Evaluate</span>
					<span class="engine-chip">Discovery</span>
					<span class="engine-chip">RFP</span>
					<span class="engine-chip">Negotiate</span>
					<span class="engine-chip">Risk</span>
					<span class="engine-chip">Executive</span>
					<span class="engine-chip">Implement</span>
					<span class="engine-chip">Vendor</span>
				</div>
			</div>
		</div>
	</section>

	<section class="feature-section alt">
		<div class="feature-block reverse">
			<div class="feature-content">
				<span class="feature-tag">Collaboration</span>
				<h2>Evaluate as a team</h2>
				<p>Invite team members to score vendors independently, then see results aggregated in real time. Create polls for quick group decisions, leave inline comments on any criterion, and track who's contributed with the activity feed.</p>
				<p>Role-based permissions ensure the right people have the right access — admins, members, and leadership each see what they need.</p>
			</div>
			<div class="feature-visual">
				<div class="collab-preview">
					<div class="preview-row"><span class="dot green"></span> Sarah scored 4 criteria</div>
					<div class="preview-row"><span class="dot blue"></span> Mike started a poll</div>
					<div class="preview-row"><span class="dot purple"></span> AI analysis completed</div>
				</div>
			</div>
		</div>
	</section>

	<section class="feature-section">
		<div class="feature-block">
			<div class="feature-content">
				<span class="feature-tag">Scoring</span>
				<h2>Weighted scoring that actually works</h2>
				<p>Define custom criteria with configurable weights. Score each vendor on a 0-10 scale, then let our algorithm calculate normalized, weighted totals and rank vendors automatically.</p>
				<p>The results page gives you a clear recommendation with side-by-side breakdowns, color-coded scores, and one-click PDF export for stakeholder presentations.</p>
			</div>
			<div class="feature-visual">
				<div class="score-preview">
					<div class="score-row">
						<span>Vendor A</span>
						<div class="mini-bar"><div class="mini-fill" style="width: 85%"></div></div>
						<span class="mini-score">8.5</span>
					</div>
					<div class="score-row">
						<span>Vendor B</span>
						<div class="mini-bar"><div class="mini-fill" style="width: 72%"></div></div>
						<span class="mini-score">7.2</span>
					</div>
					<div class="score-row">
						<span>Vendor C</span>
						<div class="mini-bar"><div class="mini-fill" style="width: 61%"></div></div>
						<span class="mini-score">6.1</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="feature-section alt">
		<div class="feature-block reverse">
			<div class="feature-content">
				<span class="feature-tag">Intelligence</span>
				<h2>Vendor discovery at scale</h2>
				<p>Search our vendor library, tap into your organization's collective intelligence, and get AI-powered recommendations — all from a single search bar.</p>
				<p>Build institutional knowledge over time. Every evaluation enriches your org's vendor intelligence, so the next project starts smarter.</p>
			</div>
			<div class="feature-visual">
				<div class="discovery-preview">
					<div class="search-mock">🔍 Search "CRM software"...</div>
					<div class="result-chips">
						<span class="rchip lib">Library (4)</span>
						<span class="rchip org">Org Intel (2)</span>
						<span class="rchip ai">AI (6)</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="cta-section">
		<h2>Ready to make better vendor decisions?</h2>
		<p>Start evaluating vendors with AI-powered intelligence — free.</p>
		<a href="https://app.tryshortlist.app/auth/signup" class="cta-button">Get Started Free</a>
	</section>
</div>

<style>
	.features-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 80px 24px;
	}

	.hero {
		text-align: center;
		margin-bottom: 80px;
		max-width: 700px;
		margin-left: auto;
		margin-right: auto;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: 800;
		color: #1a1a2e;
		margin-bottom: 16px;
		line-height: 1.2;
	}

	.hero p {
		font-size: 1.125rem;
		color: #6b7280;
	}

	.feature-section {
		padding: 64px 0;
	}

	.feature-section.alt {
		background: #f9fafb;
		margin: 0 -24px;
		padding: 64px 24px;
		border-radius: 24px;
	}

	.feature-block {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 64px;
		align-items: center;
	}

	.feature-block.reverse { direction: rtl; }
	.feature-block.reverse > * { direction: ltr; }

	@media (max-width: 768px) {
		.feature-block, .feature-block.reverse { grid-template-columns: 1fr; gap: 32px; direction: ltr; }
	}

	.feature-tag {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #4f46e5;
		margin-bottom: 12px;
	}

	.feature-content h2 {
		font-size: 1.5rem;
		color: #1a1a2e;
		margin-bottom: 16px;
	}

	.feature-content p {
		font-size: 0.9375rem;
		color: #6b7280;
		line-height: 1.7;
		margin-bottom: 12px;
	}

	.feature-visual {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.engine-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		max-width: 320px;
	}

	.engine-chip {
		padding: 8px 16px;
		background: linear-gradient(135deg, #eef2ff, #e0e7ff);
		color: #4338ca;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.collab-preview {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
		width: 100%;
		max-width: 320px;
	}

	.preview-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
		color: #374151;
	}

	.preview-row:last-child { border-bottom: none; }

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot.green { background: #22c55e; }
	.dot.blue { background: #3b82f6; }
	.dot.purple { background: #8b5cf6; }

	.score-preview {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
		width: 100%;
		max-width: 320px;
	}

	.score-row {
		display: grid;
		grid-template-columns: 80px 1fr 40px;
		align-items: center;
		gap: 12px;
		padding: 8px 0;
		font-size: 0.875rem;
	}

	.mini-bar {
		height: 8px;
		background: #f3f4f6;
		border-radius: 4px;
		overflow: hidden;
	}

	.mini-fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5, #7c3aed);
		border-radius: 4px;
	}

	.mini-score {
		font-weight: 700;
		color: #1a1a2e;
		text-align: right;
	}

	.discovery-preview {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 24px;
		width: 100%;
		max-width: 320px;
	}

	.search-mock {
		padding: 10px 16px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.875rem;
		color: #9ca3af;
		margin-bottom: 16px;
	}

	.result-chips { display: flex; gap: 8px; }

	.rchip {
		padding: 4px 12px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.rchip.lib { background: #f0f9ff; color: #0369a1; }
	.rchip.org { background: #fef3c7; color: #92400e; }
	.rchip.ai { background: #f3e8ff; color: #7c3aed; }

	.cta-section {
		text-align: center;
		padding: 80px 24px;
	}

	.cta-section h2 {
		font-size: 1.75rem;
		color: #1a1a2e;
		margin-bottom: 12px;
	}

	.cta-section p {
		font-size: 1rem;
		color: #6b7280;
		margin-bottom: 32px;
	}

	.cta-button {
		display: inline-block;
		padding: 14px 32px;
		background: #4f46e5;
		color: white;
		font-size: 1rem;
		font-weight: 600;
		border-radius: 8px;
		text-decoration: none;
		transition: background 0.15s;
	}

	.cta-button:hover { background: #4338ca; text-decoration: none; }
</style>
