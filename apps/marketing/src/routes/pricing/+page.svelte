<svelte:head>
	<title>Pricing — Shortlist</title>
	<meta name="description" content="Simple, transparent pricing for B2B procurement intelligence." />
</svelte:head>

<div class="pricing-page">
	<header class="hero">
		<div class="hero-badge">
			<span class="badge-dot"></span>
			Pricing
		</div>
		<h1>Simple, <span class="highlight">transparent</span> pricing</h1>
		<p class="hero-sub">Start free. Upgrade when your team needs more power.</p>
	</header>

	<div class="plans-grid">
		<div class="plan-card">
			<div class="plan-header">
				<h2>Starter</h2>
				<div class="plan-price">
					<span class="price">$0</span>
					<span class="period">/month</span>
				</div>
				<p class="plan-desc">For individuals evaluating vendors.</p>
			</div>
			<ul class="plan-features">
				<li>3 active projects</li>
				<li>5 vendors per project</li>
				<li>50 AI credits/month</li>
				<li>Basic scoring & comparison</li>
				<li>Export to PDF</li>
			</ul>
			<a href="https://app.tryshortlist.app/auth/signup" class="plan-cta">Get Started Free</a>
		</div>

		<div class="plan-card featured">
			<div class="plan-badge">Most Popular</div>
			<div class="plan-header">
				<h2>Pro</h2>
				<div class="plan-price">
					<span class="price">$49</span>
					<span class="period">/month</span>
				</div>
				<p class="plan-desc">For teams running multiple evaluations.</p>
			</div>
			<ul class="plan-features">
				<li>Unlimited projects</li>
				<li>Unlimited vendors</li>
				<li>500 AI credits/month</li>
				<li>All 21 AI engines</li>
				<li>Team collaboration (up to 10)</li>
				<li>Vendor discovery & SOLVE workflow</li>
				<li>File uploads & storage</li>
				<li>Priority support</li>
			</ul>
			<a href="https://app.tryshortlist.app/auth/signup" class="plan-cta featured-cta">Start Pro Trial</a>
		</div>

		<div class="plan-card">
			<div class="plan-header">
				<h2>Enterprise</h2>
				<div class="plan-price">
					<span class="price">Custom</span>
				</div>
				<p class="plan-desc">For organizations with advanced needs.</p>
			</div>
			<ul class="plan-features">
				<li>Everything in Pro</li>
				<li>Unlimited AI credits</li>
				<li>Unlimited team members</li>
				<li>SSO / SAML authentication</li>
				<li>Org-level vendor intelligence</li>
				<li>Custom integrations</li>
				<li>Audit log & compliance</li>
				<li>Dedicated account manager</li>
			</ul>
			<a href="mailto:hello@tryshortlist.app" class="plan-cta">Contact Sales</a>
		</div>
	</div>

	<section class="faq">
		<h2>Frequently asked questions</h2>
		<div class="faq-grid">
			<div class="faq-item">
				<h3>What are AI credits?</h3>
				<p>Each AI engine call uses credits based on complexity. Quick analysis uses 1 credit, standard uses 5, and deep analysis uses 20. Credits reset monthly.</p>
			</div>
			<div class="faq-item">
				<h3>Can I change plans anytime?</h3>
				<p>Yes. Upgrade or downgrade anytime. Changes take effect on your next billing cycle. Unused credits don't roll over.</p>
			</div>
			<div class="faq-item">
				<h3>Is there a free trial for Pro?</h3>
				<p>Yes — Pro includes a 14-day free trial with full access to all features. No credit card required to start.</p>
			</div>
			<div class="faq-item">
				<h3>What happens to my data if I downgrade?</h3>
				<p>Your data is never deleted. If you exceed Starter limits, existing projects become read-only until you upgrade or archive projects.</p>
			</div>
		</div>
	</section>
</div>

<style>
	.pricing-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 80px 24px;
		position: relative;
		z-index: 1;
	}

	/* ═══════ HERO ═══════ */
	.hero {
		text-align: center;
		margin-bottom: 64px;
	}
	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 18px;
		background: rgba(0, 204, 150, 0.06);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #00cc96;
		margin-bottom: 1.5rem;
		letter-spacing: 0.01em;
	}
	.badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #00cc96;
		animation: pulse 2s infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}
	.hero h1 {
		font-family: 'Playfair Display', serif;
		font-size: 3rem;
		font-weight: 800;
		color: #ffffff;
		margin-bottom: 12px;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.highlight {
		background: linear-gradient(135deg, #00cc96, #4a96f8);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.hero-sub {
		font-size: 1.125rem;
		color: #6b7e96;
		line-height: 1.7;
	}

	/* ═══════ PLANS GRID ═══════ */
	.plans-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin-bottom: 80px;
	}

	@media (max-width: 768px) {
		.plans-grid { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; }
	}

	.plan-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		padding: 32px;
		display: flex;
		flex-direction: column;
		position: relative;
		transition: border-color 0.2s;
	}
	.plan-card:hover { border-color: rgba(255, 255, 255, 0.12); }

	.plan-card.featured {
		border-color: rgba(0, 204, 150, 0.35);
		background: rgba(0, 204, 150, 0.03);
		box-shadow: 0 8px 32px rgba(0, 204, 150, 0.08);
	}

	.plan-badge {
		position: absolute;
		top: -12px;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(135deg, #00cc96, #00b386);
		color: #061510;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 4px 16px;
		border-radius: 9999px;
		letter-spacing: 0.03em;
	}

	.plan-header { margin-bottom: 24px; }

	.plan-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: #ffffff;
		margin-bottom: 8px;
		font-family: 'Figtree', sans-serif;
	}

	.plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }

	.price {
		font-size: 2.25rem;
		font-weight: 800;
		color: #ffffff;
	}

	.period {
		font-size: 0.875rem;
		color: #6b7e96;
	}

	.plan-desc {
		font-size: 0.875rem;
		color: #6b7e96;
	}

	.plan-features {
		list-style: none;
		padding: 0;
		margin: 0 0 32px;
		flex: 1;
	}

	.plan-features li {
		padding: 8px 0;
		font-size: 0.875rem;
		color: #c0c8d4;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.plan-features li::before {
		content: '✓ ';
		color: #00cc96;
		font-weight: 700;
	}

	.plan-cta {
		display: block;
		text-align: center;
		padding: 12px 24px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #dde4ef;
		text-decoration: none;
		transition: all 0.17s;
		font-family: 'Figtree', sans-serif;
	}

	.plan-cta:hover { border-color: rgba(255, 255, 255, 0.28); text-decoration: none; }

	.featured-cta {
		background: #00cc96;
		color: #061510;
		border-color: #00cc96;
		font-weight: 700;
	}

	.featured-cta:hover {
		background: #009e74;
		border-color: #009e74;
		box-shadow: 0 8px 22px rgba(0, 204, 150, 0.22);
	}

	/* ═══════ FAQ ═══════ */
	.faq { max-width: 800px; margin: 0 auto; }

	.faq h2 {
		font-family: 'Playfair Display', serif;
		font-size: 1.75rem;
		font-weight: 800;
		text-align: center;
		margin-bottom: 40px;
		color: #ffffff;
	}

	.faq-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 32px;
	}

	@media (max-width: 640px) { .faq-grid { grid-template-columns: 1fr; } }

	.faq-item {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		padding: 24px;
		transition: border-color 0.2s;
	}
	.faq-item:hover { border-color: rgba(255, 255, 255, 0.12); }

	.faq-item h3 {
		font-size: 0.9375rem;
		font-weight: 700;
		color: #dde4ef;
		margin-bottom: 8px;
		font-family: 'Figtree', sans-serif;
	}

	.faq-item p {
		font-size: 0.875rem;
		color: #6b7e96;
		line-height: 1.65;
		margin: 0;
	}

	@media (max-width: 768px) {
		.hero h1 { font-size: 2.25rem; }
	}
</style>
