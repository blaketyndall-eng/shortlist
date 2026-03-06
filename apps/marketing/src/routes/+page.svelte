<svelte:head>
	<title>Shortlist — AI-Powered Procurement Intelligence</title>
</svelte:head>

<main class="hero">
	<h1>Make better procurement decisions</h1>
	<p>Shortlist uses AI to help teams evaluate vendors, score proposals, and build consensus — faster.</p>
	<div class="cta-group">
		<a href="https://app.tryshortlist.app/auth/signup" class="btn-primary">Start Free Trial</a>
		<a href="/features" class="btn-secondary">See How It Works</a>
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
		max-width: 720px;
		margin: 0 auto;
	}

	h1 {
		font-size: 3rem;
		font-weight: 800;
		line-height: 1.1;
		margin-bottom: 1.5rem;
		color: #0f172a;
	}

	p {
		font-size: 1.25rem;
		color: #64748b;
		margin-bottom: 2.5rem;
		max-width: 560px;
	}

	.cta-group {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.btn-primary {
		padding: 0.75rem 2rem;
		background: #2563eb;
		color: white;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		transition: background 0.15s;
	}

	.btn-primary:hover { background: #1d4ed8; text-decoration: none; }

	.btn-secondary {
		padding: 0.75rem 2rem;
		background: white;
		color: #334155;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		text-decoration: none;
		transition: background 0.15s;
	}

	.btn-secondary:hover { background: #f8fafc; text-decoration: none; }
</style>
