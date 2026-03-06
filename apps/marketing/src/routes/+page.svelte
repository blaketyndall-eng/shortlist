<svelte:head>
	<title>Shortlist — AI-Powered Procurement Intelligence</title>
</svelte:head>

<main class="hero">
	<div class="hero-badge">AI-Powered Procurement Intelligence</div>
	<h1>Make better vendor decisions, <span class="highlight">faster</span></h1>
	<p>Shortlist uses AI to help teams discover vendors, evaluate options, score proposals, and build consensus — from first trigger to final decision.</p>
	<div class="cta-group">
		<a href="https://app.tryshortlist.app/auth/signup" class="btn-primary">Start Free Trial</a>
		<a href="/features" class="btn-secondary">See How It Works</a>
	</div>
	<div class="hero-stats">
		<div class="stat">
			<span class="stat-num">21</span>
			<span class="stat-label">AI Engine Types</span>
		</div>
		<div class="stat-divider"></div>
		<div class="stat">
			<span class="stat-num">7</span>
			<span class="stat-label">SOLVE Steps</span>
		</div>
		<div class="stat-divider"></div>
		<div class="stat">
			<span class="stat-num">10+</span>
			<span class="stat-label">Advanced Tools</span>
		</div>
	</div>
</main>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		text-align: center;
		padding: 4rem 2rem;
		max-width: 760px;
		margin: 0 auto;
	}

	.hero-badge {
		display: inline-block;
		padding: 6px 16px;
		background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2);
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #00cc96;
		margin-bottom: 2rem;
		letter-spacing: 0.02em;
	}

	h1 {
		font-family: 'Playfair Display', serif;
		font-size: 3.25rem;
		font-weight: 800;
		line-height: 1.1;
		margin-bottom: 1.5rem;
		color: #ffffff;
	}

	.highlight {
		background: linear-gradient(135deg, #00cc96, #4a96f8);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	p {
		font-size: 1.1875rem;
		color: #8b95a5;
		margin-bottom: 2.5rem;
		max-width: 580px;
		line-height: 1.7;
	}

	.cta-group {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-bottom: 4rem;
	}

	.btn-primary {
		padding: 0.75rem 2rem;
		background: linear-gradient(135deg, #00cc96, #00b386);
		color: white;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.btn-primary:hover { opacity: 0.9; text-decoration: none; }

	.btn-secondary {
		padding: 0.75rem 2rem;
		background: transparent;
		color: #c0c8d4;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
	}

	.btn-secondary:hover { border-color: rgba(255, 255, 255, 0.3); color: #ffffff; text-decoration: none; }

	.hero-stats {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 1.5rem 2.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.stat-num {
		font-size: 1.5rem;
		font-weight: 800;
		color: #00cc96;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #8b95a5;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-divider {
		width: 1px;
		height: 32px;
		background: rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 640px) {
		h1 { font-size: 2.25rem; }
		.hero-stats { flex-direction: column; gap: 1rem; }
		.stat-divider { width: 32px; height: 1px; }
	}
</style>
