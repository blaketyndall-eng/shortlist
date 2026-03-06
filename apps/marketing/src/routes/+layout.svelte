<script lang="ts">
	let { children } = $props();
</script>

<div class="marketing-layout">
	<nav class="top-nav">
		<a href="/" class="nav-logo">
			<span class="logo-mark">S</span>
			<span>Shortlist</span>
		</a>
		<div class="nav-links">
			<a href="/features">Features</a>
			<a href="/pricing">Pricing</a>
			<a href="https://app.tryshortlist.app/auth/login" class="nav-login">Log in</a>
			<a href="https://app.tryshortlist.app/auth/signup" class="nav-cta">Get Started</a>
		</div>
	</nav>

	{@render children()}

	<footer class="site-footer">
		<div class="footer-inner">
			<div class="footer-brand">
				<span class="logo-mark">S</span>
				<span>Shortlist</span>
			</div>
			<div class="footer-links">
				<a href="/features">Features</a>
				<a href="/pricing">Pricing</a>
				<a href="mailto:hello@tryshortlist.app">Contact</a>
			</div>
			<p class="footer-copy">© {new Date().getFullYear()} Shortlist. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');

	:global(body) {
		margin: 0;
		font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		color: #e0e6ed;
		background: #0b1017;
		-webkit-font-smoothing: antialiased;
	}

	:global(*, *::before, *::after) { box-sizing: border-box; }

	.marketing-layout { min-height: 100vh; display: flex; flex-direction: column; }

	.top-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 32px;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.nav-logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: #ffffff;
		font-weight: 700;
		font-size: 1.125rem;
	}

	.logo-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: linear-gradient(135deg, #00cc96, #4a96f8);
		color: white;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.nav-links a {
		font-size: 0.9375rem;
		color: #8b95a5;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.15s;
	}

	.nav-links a:hover { color: #ffffff; }

	.nav-login { color: #c0c8d4 !important; }

	.nav-cta {
		padding: 8px 20px !important;
		background: linear-gradient(135deg, #00cc96, #00b386) !important;
		color: white !important;
		border-radius: 6px;
		font-weight: 600 !important;
		transition: opacity 0.15s !important;
	}

	.nav-cta:hover { opacity: 0.9; }

	.site-footer {
		margin-top: auto;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		padding: 48px 32px;
	}

	.footer-inner {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 16px;
	}

	.footer-brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		color: #ffffff;
	}

	.footer-links {
		display: flex;
		gap: 24px;
	}

	.footer-links a {
		font-size: 0.875rem;
		color: #8b95a5;
		text-decoration: none;
		transition: color 0.15s;
	}

	.footer-links a:hover { color: #ffffff; }

	.footer-copy {
		font-size: 0.8125rem;
		color: #5a6472;
		width: 100%;
		text-align: center;
		margin-top: 16px;
	}

	@media (max-width: 640px) {
		.top-nav { padding: 12px 16px; }
		.nav-links { gap: 12px; }
		.nav-links a { font-size: 0.8125rem; }
	}
</style>
