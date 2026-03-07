<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();
	let mobileOpen = $state(false);
</script>

<div class="marketing-layout">
	<nav class="top-nav">
		<a href="/" class="nav-logo">
			<span class="logo-text">Short<em>list</em></span>
		</a>
		<button class="mobile-toggle" onclick={() => mobileOpen = !mobileOpen} aria-label="Toggle menu">
			{#if mobileOpen}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			{/if}
		</button>
		<div class="nav-links" class:mobile-open={mobileOpen}>
			<a href="/features" class:nav-active={page.url.pathname === '/features'} onclick={() => mobileOpen = false}>Features</a>
			<a href="/demo" class:nav-active={page.url.pathname === '/demo'} onclick={() => mobileOpen = false}>Demo</a>
			<a href="/compare" class:nav-active={page.url.pathname === '/compare'} onclick={() => mobileOpen = false}>vs. Spreadsheets</a>
			<a href="/pricing" class:nav-active={page.url.pathname === '/pricing'} onclick={() => mobileOpen = false}>Pricing</a>
			<a href="https://app.tryshortlist.app/auth/login" class="nav-login" onclick={() => mobileOpen = false}>Log in</a>
			<a href="https://app.tryshortlist.app/auth/signup" class="nav-cta" onclick={() => mobileOpen = false}>Get Started</a>
		</div>
	</nav>

	{@render children()}

	<footer class="site-footer">
		<div class="footer-inner">
			<div class="footer-brand">
				<span class="footer-logo-text">Short<em>list</em></span>
			</div>
			<div class="footer-links">
				<a href="/features">Features</a>
				<a href="/compare">vs. Spreadsheets</a>
				<a href="/demo">Demo</a>
				<a href="/pricing">Pricing</a>
				<a href="mailto:hello@tryshortlist.app">Contact</a>
			</div>
			<div class="footer-legal">
				<a href="/privacy">Privacy Policy</a>
				<span class="footer-dot">·</span>
				<a href="/terms">Terms of Service</a>
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

	:global(body::before) {
		content: '';
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background:
			radial-gradient(ellipse 65% 45% at 10% 0%, rgba(0, 204, 150, 0.07), transparent 58%),
			radial-gradient(ellipse 45% 35% at 90% 96%, rgba(74, 150, 248, 0.055), transparent 58%);
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
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(11, 16, 23, 0.9);
		backdrop-filter: blur(14px);
	}

	.nav-logo {
		display: flex;
		align-items: center;
		text-decoration: none;
	}

	.logo-text, .footer-logo-text {
		font-family: 'Playfair Display', serif;
		font-size: 19px;
		font-weight: 700;
		color: #ffffff;
	}

	.logo-text em, .footer-logo-text em {
		color: #00cc96;
		font-style: normal;
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
	.nav-links a.nav-active { color: #00cc96; }

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

	.mobile-toggle {
		display: none; background: none; border: none; color: #8b95a5;
		cursor: pointer; padding: 4px;
	}

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

	.footer-legal {
		width: 100%;
		display: flex;
		justify-content: center;
		gap: 8px;
		margin-top: 12px;
	}
	.footer-legal a {
		font-size: 0.75rem;
		color: #5a6472;
		text-decoration: none;
		transition: color 0.15s;
	}
	.footer-legal a:hover { color: #8b95a5; }
	.footer-dot { font-size: 0.75rem; color: #3a4a5c; }

	.footer-copy {
		font-size: 0.8125rem;
		color: #5a6472;
		width: 100%;
		text-align: center;
		margin-top: 8px;
	}

	@media (max-width: 640px) {
		.top-nav { padding: 12px 16px; }
		.mobile-toggle { display: block; }
		.nav-links {
			display: none; flex-direction: column; gap: 0;
			position: absolute; top: 100%; left: 0; right: 0;
			background: rgba(11, 16, 23, 0.97); backdrop-filter: blur(14px);
			border-bottom: 1px solid rgba(255,255,255,0.06);
			padding: 8px 0;
		}
		.nav-links.mobile-open { display: flex; }
		.nav-links a { font-size: 0.9375rem; padding: 12px 24px; }
		.nav-links a:hover { background: rgba(255,255,255,0.04); }
		.nav-cta { margin: 8px 16px !important; text-align: center; border-radius: 8px; padding: 12px 20px !important; }
	}
</style>
