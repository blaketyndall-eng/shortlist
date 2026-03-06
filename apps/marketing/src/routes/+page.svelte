<svelte:head>
	<title>Shortlist — Purchase Intelligence Platform</title>
	<meta name="description" content="From 'we need a CRM' to signed contract — in weeks, not quarters. Shortlist gives your team one AI-powered workspace to define requirements, evaluate vendors, and get leadership sign-off." />
</svelte:head>

<section class="hero">
	<div class="hero-content">
		<p class="hero-label">PURCHASE INTELLIGENCE PLATFORM</p>
		<h1 class="hero-title">
			Stop spending months<br />
			<span class="hero-accent">choosing software.</span>
		</h1>
		<p class="hero-description">
			From "we need a CRM" to signed contract — in weeks, not quarters.
			Shortlist gives your team one AI-powered workspace to define requirements,
			evaluate vendors, and get leadership sign-off. No more spreadsheets. No more gut feel.
		</p>
		<div class="hero-cta-group">
			<a href="https://app.tryshortlist.app/auth/signup" class="btn-primary">
				Start your first evaluation <span class="arrow">→</span>
			</a>
			<a href="/demo" class="btn-secondary">
				<span class="play-icon">▶</span> Try the live demo
			</a>
		</div>
		<div class="hero-trust">
			<span>✦ 7 day free trial</span>
			<span>✦ No credit card required</span>
			<span>✦ 5 minute setup</span>
		</div>
	</div>

	<div class="hero-mockup">
		<div class="mockup-window">
			<div class="mockup-titlebar">
				<div class="titlebar-dots">
					<span class="dot red"></span>
					<span class="dot yellow"></span>
					<span class="dot green"></span>
				</div>
				<div class="titlebar-url">
					<span>tryshortlist.app</span>
				</div>
			</div>
			<div class="mockup-body">
				<div class="mockup-header">
					<span class="mockup-logo">Short<em>list</em></span>
					<div class="mockup-avatars">
						<span class="avatar teal">S</span>
						<span class="avatar blue">E</span>
					</div>
				</div>
				<h3 class="mockup-title">CRM Selection 2026</h3>
				<div class="mockup-cards">
					<div class="mockup-card card-teal">
						<div class="card-icon">🔍</div>
						<h4 class="card-label teal-text">Solve</h4>
						<p class="card-text">Problem defined. 3 vendors shortlisted based on your constraints.</p>
					</div>
					<div class="mockup-card card-blue">
						<div class="card-icon">📊</div>
						<h4 class="card-label blue-text">Evaluate</h4>
						<p class="card-text">Weighted scoring across 8 criteria. 4 team evaluators.</p>
					</div>
				</div>
				<div class="mockup-rankings">
					<h5 class="rankings-title">VENDOR RANKINGS</h5>
					<div class="rank-row">
						<span class="rank-dot teal-bg"></span>
						<span class="rank-name">HubSpot CRM</span>
						<div class="rank-bar"><div class="rank-fill teal-fill" style="width: 88%"></div></div>
						<span class="rank-score teal-text">8.8</span>
					</div>
					<div class="rank-row">
						<span class="rank-dot blue-bg"></span>
						<span class="rank-name">Salesforce</span>
						<div class="rank-bar"><div class="rank-fill blue-fill" style="width: 82%"></div></div>
						<span class="rank-score blue-text">8.2</span>
					</div>
					<div class="rank-row">
						<span class="rank-dot amber-bg"></span>
						<span class="rank-name">Pipedrive</span>
						<div class="rank-bar"><div class="rank-fill amber-fill" style="width: 74%"></div></div>
						<span class="rank-score amber-text">7.4</span>
					</div>
				</div>
				<div class="mockup-tabs">
					<span class="tab teal-tab">📊 Dashboard</span>
					<span class="tab blue-tab">📄 Exec Brief</span>
					<span class="tab red-tab">🧠 Intelligence</span>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 4rem;
		max-width: 1140px;
		margin: 0 auto;
		padding: 4rem 24px 6rem;
		min-height: 85vh;
	}

	.hero-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: #00cc96;
		margin-bottom: 1.5rem;
	}

	.hero-title {
		font-family: 'Figtree', sans-serif;
		font-size: 3.5rem;
		font-weight: 700;
		line-height: 1.08;
		color: #dde4ef;
		margin-bottom: 1.75rem;
		letter-spacing: -0.02em;
	}

	.hero-accent {
		color: #00cc96;
		font-family: 'Playfair Display', Georgia, serif;
		font-style: italic;
		font-weight: 700;
	}

	.hero-description {
		font-size: 14px;
		line-height: 1.75;
		color: #6b7e96;
		margin-bottom: 2.5rem;
		max-width: 520px;
	}

	.hero-cta-group {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 11px 28px;
		background: #00cc96;
		color: #061510;
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		font-family: 'Figtree', sans-serif;
		text-decoration: none;
		transition: all 0.17s;
		box-shadow: 0 0 20px rgba(0, 204, 150, 0.22);
	}

	.btn-primary:hover {
		background: #009e74;
		text-decoration: none;
		transform: translateY(-1px);
		box-shadow: 0 8px 22px rgba(0, 204, 150, 0.22);
	}

	.arrow { font-size: 1.1em; }

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 11px 28px;
		background: transparent;
		color: #dde4ef;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		font-weight: 600;
		font-size: 14px;
		font-family: 'Figtree', sans-serif;
		text-decoration: none;
		transition: all 0.17s;
	}

	.btn-secondary:hover {
		border-color: rgba(255, 255, 255, 0.28);
		text-decoration: none;
	}

	.play-icon { font-size: 0.75em; }

	.hero-trust {
		display: flex;
		gap: 1.5rem;
		font-size: 12px;
		color: #3a4a5c;
	}

	.hero-trust span { display: flex; align-items: center; gap: 0.375rem; }

	/* ─── App Mockup ─────────────────────────────────── */
	.hero-mockup {
		display: flex;
		justify-content: center;
	}

	.mockup-window {
		width: 100%;
		max-width: 460px;
		background: #121b27;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		overflow: hidden;
		box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 204, 150, 0.05);
	}

	.mockup-titlebar {
		display: flex;
		align-items: center;
		padding: 12px 16px;
		background: #19243a;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.titlebar-dots {
		display: flex;
		gap: 6px;
		margin-right: 12px;
	}

	.dot { width: 10px; height: 10px; border-radius: 50%; }
	.dot.red { background: #f05050; }
	.dot.yellow { background: #f0a034; }
	.dot.green { background: #00cc96; }

	.titlebar-url {
		flex: 1;
		text-align: center;
		font-size: 11px;
		color: #3a4a5c;
		background: rgba(255, 255, 255, 0.03);
		padding: 4px 12px;
		border-radius: 6px;
	}

	.mockup-body {
		padding: 20px;
	}

	.mockup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.mockup-logo {
		font-family: 'Playfair Display', serif;
		font-size: 19px;
		font-weight: 700;
		color: #dde4ef;
	}

	.mockup-logo em {
		color: #00cc96;
		font-style: normal;
	}

	.mockup-avatars { display: flex; gap: 6px; }

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 700;
		color: white;
	}

	.avatar.teal { background: #00cc96; }
	.avatar.blue { background: #4a96f8; }

	.mockup-title {
		font-family: 'Playfair Display', serif;
		font-size: 22px;
		font-weight: 700;
		color: #dde4ef;
		text-align: center;
		margin-bottom: 16px;
	}

	.mockup-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 16px;
	}

	.mockup-card {
		border-radius: 12px;
		padding: 14px;
	}

	.card-teal {
		background: linear-gradient(135deg, rgba(0,204,150,.09), rgba(0,204,150,.03));
		border: 1px solid rgba(0,204,150,.2);
	}

	.card-blue {
		background: linear-gradient(135deg, rgba(74,150,248,.09), rgba(74,150,248,.03));
		border: 1px solid rgba(74,150,248,.2);
	}

	.card-icon { font-size: 1.25rem; margin-bottom: 8px; }

	.card-label {
		font-size: 13px;
		font-weight: 700;
		margin-bottom: 4px;
	}

	.teal-text { color: #00cc96; }
	.blue-text { color: #4a96f8; }
	.amber-text { color: #f0a034; }

	.card-text {
		font-size: 11px;
		color: #6b7e96;
		line-height: 1.65;
		margin-bottom: 0;
	}

	.mockup-rankings {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 14px;
		margin-bottom: 14px;
	}

	.rankings-title {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.7px;
		color: #6b7e96;
		margin-bottom: 12px;
		text-transform: uppercase;
	}

	.rank-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.rank-row:last-child { margin-bottom: 0; }

	.rank-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.teal-bg { background: #00cc96; }
	.blue-bg { background: #4a96f8; }
	.amber-bg { background: #f0a034; }

	.rank-name {
		font-size: 13px;
		color: #dde4ef;
		font-weight: 600;
		min-width: 90px;
	}

	.rank-bar {
		flex: 1;
		height: 5px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 3px;
		overflow: hidden;
	}

	.rank-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 1.2s cubic-bezier(.16,1,.3,1);
	}

	.teal-fill { background: #00cc96; }
	.blue-fill { background: #4a96f8; }
	.amber-fill { background: #f0a034; }

	.rank-score {
		font-size: 14px;
		font-weight: 700;
		min-width: 28px;
		text-align: right;
	}

	.mockup-tabs {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 8px;
	}

	.tab {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 8px;
		border-radius: 7px;
		font-size: 11px;
		font-weight: 600;
		color: #dde4ef;
	}

	.teal-tab { background: rgba(0, 204, 150, 0.14); border: 1px solid rgba(0, 204, 150, 0.26); }
	.blue-tab { background: rgba(74, 150, 248, 0.14); border: 1px solid rgba(74, 150, 248, 0.26); }
	.red-tab { background: rgba(240, 80, 80, 0.14); border: 1px solid rgba(240, 80, 80, 0.26); }

	/* ─── Responsive ──────────────────────────────── */
	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
			text-align: center;
			gap: 3rem;
			padding: 2rem 20px 4rem;
		}

		.hero-title { font-size: 2.5rem; }

		.hero-description {
			max-width: none;
			margin-left: auto;
			margin-right: auto;
		}

		.hero-cta-group { justify-content: center; }
		.hero-trust { justify-content: center; flex-wrap: wrap; }

		.mockup-window { max-width: 380px; }
	}

	@media (max-width: 480px) {
		.hero-title { font-size: 2rem; }
		.hero-trust { flex-direction: column; align-items: center; gap: 0.5rem; }
	}
</style>
