<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
</svelte:head>

<div class="marketing-layout">
	<nav class="top-nav">
		<a href="/" class="nav-logo">
			<span class="logo-text">Short<em class="logo-accent">list</em></span>
			<span class="nav-tagline">Procurement Intelligence</span>
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
				<span class="logo-text">Short<em class="logo-accent">list</em></span>
			</div>
			<div class="footer-mid">Procurement Intelligence · © {new Date().getFullYear()} Shortlist</div>
			<div class="footer-links">
				<a href="/features">Features</a>
				<a href="/pricing">Pricing</a>
				<a href="mailto:hello@tryshortlist.app">Contact</a>
			</div>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		color: #dde4ef;
		background: #0b1017;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		overflow-x: hidden;
	}

	:global(body::before) {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background: radial-gradient(ellipse 65% 45% at 10% 0%, rgba(0,204,150,.07), transparent 58%),
		            radial-gradient(ellipse 45% 35% at 90% 96%, rgba(74,150,248,.055), transparent 58%);
	}

	:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

	.marketing-layout { min-height: 100vh; display: flex; flex-direction: column; position: relative; z-index: 1; }

	.top-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px 28px;
		max-width: 1140px;
		width: 100%;
		margin: 0 auto;
		border-bottom: 1px solid rgba(255,255,255,.08);
		background: rgba(11,16,23,.9);
		backdrop-filter: blur(14px);
		position: sticky;
		top: 0;
		z-index: 200;
	}

	.nav-logo {
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 12px;
		margin-right: auto;
	}

	.nav-tagline {
		font-size: 11px;
		color: #6b7e96;
	}

	.logo-text {
		font-family: 'Playfair Display', serif;
		font-size: 19px;
		font-weight: 700;
		color: #dde4ef;
	}

	:global(.logo-accent) {
		color: #00cc96;
		font-style: normal;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.nav-links a {
		font-size: 14px;
		color: #6b7e96;
		text-decoration: none;
		font-weight: 600;
		transition: color 0.15s;
	}

	.nav-links a:hover { color: #dde4ef; }

	.nav-login { color: #6b7e96 !important; }

	.nav-cta {
		padding: 10px 20px !important;
		background: #00cc96;
		color: #061510 !important;
		border-radius: 8px;
		font-weight: 600 !important;
		transition: all 0.17s;
	}

	.nav-cta:hover {
		background: #009e74;
		transform: translateY(-1px);
		box-shadow: 0 8px 22px rgba(0,204,150,.22);
	}

	.site-footer {
		margin-top: auto;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding: 48px 28px;
	}

	.footer-inner {
		max-width: 1140px;
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
	}

	.footer-links {
		display: flex;
		gap: 24px;
	}

	.footer-links a {
		font-size: 0.875rem;
		color: #3a4a5c;
		text-decoration: none;
		transition: color 0.15s;
	}

	.footer-links a:hover { color: #6b7e96; }

	.footer-mid {
		font-size: 11px;
		color: #3a4a5c;
	}

	@media (max-width: 640px) {
		.top-nav { padding: 12px 16px; }
		.nav-links { gap: 12px; }
		.nav-links a { font-size: 12px; }
	}
</style>
