<svelte:head>
	<title>Pricing — Shortlist</title>
	<meta name="description" content="Simple, transparent pricing for B2B procurement intelligence." />
</svelte:head>

<div class="pricing-page">
	<header class="hero">
		<h1>Simple, transparent pricing</h1>
		<p>Start free. Upgrade when your team needs more.</p>
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
				<li>All 8 AI engines</li>
				<li>Team collaboration (up to 10)</li>
				<li>Vendor discovery</li>
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
	}

	.hero {
		text-align: center;
		margin-bottom: 64px;
	}

	.hero h1 {
		font-size: 2.5rem;
		font-weight: 800;
		color: #1a1a2e;
		margin-bottom: 12px;
	}

	.hero p {
		font-size: 1.125rem;
		color: #6b7280;
	}

	.plans-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
		margin-bottom: 80px;
	}

	@media (max-width: 768px) {
		.plans-grid { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; }
	}

	.plan-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 16px;
		padding: 32px;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.plan-card.featured {
		border-color: #4f46e5;
		box-shadow: 0 8px 32px rgba(79, 70, 229, 0.12);
	}

	.plan-badge {
		position: absolute;
		top: -12px;
		left: 50%;
		transform: translateX(-50%);
		background: linear-gradient(135deg, #4f46e5, #7c3aed);
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 4px 16px;
		border-radius: 9999px;
		letter-spacing: 0.03em;
	}

	.plan-header { margin-bottom: 24px; }

	.plan-header h2 {
		font-size: 1.25rem;
		color: #1a1a2e;
		margin-bottom: 8px;
	}

	.plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }

	.price {
		font-size: 2.25rem;
		font-weight: 800;
		color: #1a1a2e;
	}

	.period {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.plan-desc {
		font-size: 0.875rem;
		color: #6b7280;
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
		color: #374151;
		border-bottom: 1px solid #f3f4f6;
	}

	.plan-features li::before {
		content: '✓ ';
		color: #16a34a;
		font-weight: 700;
	}

	.plan-cta {
		display: block;
		text-align: center;
		padding: 12px 24px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #374151;
		text-decoration: none;
		transition: all 0.15s;
	}

	.plan-cta:hover { background: #f9fafb; text-decoration: none; }

	.featured-cta {
		background: #4f46e5;
		color: white;
		border-color: #4f46e5;
	}

	.featured-cta:hover { background: #4338ca; }

	.faq { max-width: 800px; margin: 0 auto; }

	.faq h2 {
		font-size: 1.5rem;
		text-align: center;
		margin-bottom: 40px;
		color: #1a1a2e;
	}

	.faq-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 32px;
	}

	@media (max-width: 640px) { .faq-grid { grid-template-columns: 1fr; } }

	.faq-item h3 {
		font-size: 0.9375rem;
		color: #1a1a2e;
		margin-bottom: 8px;
	}

	.faq-item p {
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.6;
	}
</style>
