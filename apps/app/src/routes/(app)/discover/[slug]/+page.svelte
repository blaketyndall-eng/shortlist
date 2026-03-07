<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';

	let { data } = $props();

	const vendor = data.vendor;
	const category = data.category;
	let enriching = $state(false);

	function nameToHue(name: string): number {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return Math.abs(hash) % 360;
	}

	const hue = nameToHue(vendor.name);

	async function triggerEnrich() {
		enriching = true;
		try {
			await fetch('/api/vendors/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vendorId: vendor.id }),
			});
			// Reload page to show new data
			window.location.reload();
		} catch { /* ignore */ }
		enriching = false;
	}

	// Parse JSON arrays safely
	function parseArr(val: unknown): string[] {
		if (Array.isArray(val)) return val;
		if (typeof val === 'string') {
			try { return JSON.parse(val); } catch { return []; }
		}
		return [];
	}

	const strengths = parseArr(vendor.ai_strengths);
	const concerns = parseArr(vendor.ai_concerns);
	const watchOutFor = parseArr(vendor.ai_watch_out_for);
	const competitors = parseArr(vendor.ai_competitors);
	const features = parseArr(vendor.features);
	const certs = parseArr(vendor.compliance_certs);
</script>

<svelte:head>
	<title>{vendor.name} — Shortlist Vendor Profile</title>
</svelte:head>

<div class="profile-page">
	<!-- Breadcrumb -->
	<nav class="breadcrumb">
		<a href="/discover">← Discover</a>
		{#if category}
			<span class="sep">/</span>
			<a href="/discover?category={category.slug}">{category.name}</a>
		{/if}
		<span class="sep">/</span>
		<span class="current">{vendor.name}</span>
	</nav>

	<!-- Hero -->
	<header class="vendor-hero">
		<div class="hero-avatar" style="background: hsl({hue}, 65%, 55%)">
			{vendor.name.charAt(0)}
		</div>
		<div class="hero-info">
			<div class="hero-name-row">
				<h1>{vendor.name}</h1>
				{#if vendor.is_verified || vendor.trust_tier === 'verified'}
					<span class="verified-badge">✓ Verified</span>
				{/if}
				{#if vendor.enrichment_status === 'enriched'}
					<span class="enriched-badge">AI Enriched</span>
				{/if}
			</div>
			{#if vendor.tagline}
				<p class="tagline">{vendor.tagline}</p>
			{/if}
			<div class="hero-meta">
				{#if category}
					<span class="meta-tag">{category.icon} {category.name}</span>
				{/if}
				{#if vendor.size}
					<span class="meta-tag">{vendor.size}</span>
				{/if}
				{#if vendor.tier}
					<span class="meta-tag">{vendor.tier}</span>
				{/if}
			</div>
			{#if vendor.website}
				<a href={vendor.website} target="_blank" rel="noopener" class="website-link">
					{vendor.website.replace('https://', '').replace('http://', '')} ↗
				</a>
			{/if}
		</div>
	</header>

	<div class="profile-grid">
		<!-- Left Column: Intelligence -->
		<div class="col-left">
			<!-- AI Overview -->
			{#if vendor.ai_overview}
				<Card>
					<div class="section-header">
						<h2>AI Overview</h2>
						<Button variant="ghost" onclick={triggerEnrich} loading={enriching}>
							Re-enrich
						</Button>
					</div>
					<p class="overview-text">{vendor.ai_overview}</p>
				</Card>
			{:else}
				<Card>
					<div class="section-header">
						<h2>AI Overview</h2>
						<Button variant="primary" onclick={triggerEnrich} loading={enriching}>
							Generate Intelligence
						</Button>
					</div>
					<p class="empty-hint">No AI intelligence yet. Click to enrich this vendor profile.</p>
				</Card>
			{/if}

			<!-- Description -->
			{#if vendor.description}
				<Card>
					<h2>About</h2>
					<p class="about-text">{vendor.description}</p>
					{#if vendor.best_for}
						<p class="best-for"><strong>Best for:</strong> {vendor.best_for}</p>
					{/if}
				</Card>
			{/if}

			<!-- Key Strengths -->
			{#if strengths.length > 0}
				<Card>
					<h2>Key Strengths</h2>
					<ul class="strength-list">
						{#each strengths as s}
							<li>✓ {s}</li>
						{/each}
					</ul>
				</Card>
			{/if}

			<!-- Vendor Intelligence -->
			{#if watchOutFor.length > 0 || concerns.length > 0 || vendor.ai_pricing || vendor.ai_impl_complexity || vendor.ai_g2_position}
				<Card>
					<h2>Vendor Intelligence</h2>
					<div class="intel-grid">
						{#if watchOutFor.length > 0}
							<div class="intel-item">
								<span class="intel-icon">⚠️</span>
								<div>
									<span class="intel-label">Watch Out For</span>
									{#each watchOutFor as w}
										<p class="intel-value">{w}</p>
									{/each}
								</div>
							</div>
						{/if}

						{#if concerns.length > 0}
							<div class="intel-item">
								<span class="intel-icon">🔴</span>
								<div>
									<span class="intel-label">Potential Concerns</span>
									{#each concerns as c}
										<p class="intel-value">{c}</p>
									{/each}
								</div>
							</div>
						{/if}

						{#if vendor.ai_pricing}
							<div class="intel-item">
								<span class="intel-icon">💰</span>
								<div>
									<span class="intel-label">Typical Pricing</span>
									<p class="intel-value">{vendor.ai_pricing}</p>
								</div>
							</div>
						{/if}

						{#if vendor.ai_impl_complexity}
							<div class="intel-item">
								<span class="intel-icon">🔧</span>
								<div>
									<span class="intel-label">Implementation</span>
									<p class="intel-value">
										<span class="complexity" class:low={vendor.ai_impl_complexity === 'low'} class:medium={vendor.ai_impl_complexity === 'medium'} class:high={vendor.ai_impl_complexity === 'high'}>
											{vendor.ai_impl_complexity}
										</span>
										{#if vendor.ai_impl_note}
											— {vendor.ai_impl_note}
										{/if}
									</p>
								</div>
							</div>
						{/if}

						{#if vendor.ai_g2_position}
							<div class="intel-item">
								<span class="intel-icon">📊</span>
								<div>
									<span class="intel-label">Market Position</span>
									<p class="intel-value">{vendor.ai_g2_position}</p>
								</div>
							</div>
						{/if}
					</div>
				</Card>
			{/if}

			<!-- Competitors -->
			{#if competitors.length > 0}
				<Card>
					<h2>Competitors</h2>
					<div class="competitor-chips">
						{#each competitors as c}
							<span class="competitor-chip">{c}</span>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- Data Sources -->
			{#if vendor.enriched_at}
				<div class="data-meta">
					<span>Last enriched: {new Date(vendor.enriched_at).toLocaleDateString()}</span>
					{#if vendor.data_sources?.length}
						<span> · {parseArr(vendor.data_sources).length} data source{parseArr(vendor.data_sources).length !== 1 ? 's' : ''}</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Right Column: Quick Facts -->
		<div class="col-right">
			<!-- Quick Facts -->
			<Card>
				<h2>Quick Facts</h2>
				<div class="facts-list">
					{#if vendor.founded}
						<div class="fact-row">
							<span class="fact-label">Founded</span>
							<span class="fact-value">{vendor.founded}</span>
						</div>
					{/if}
					{#if vendor.hq_location}
						<div class="fact-row">
							<span class="fact-label">HQ</span>
							<span class="fact-value">{vendor.hq_location}</span>
						</div>
					{/if}
					{#if vendor.employee_range}
						<div class="fact-row">
							<span class="fact-label">Employees</span>
							<span class="fact-value">{vendor.employee_range}</span>
						</div>
					{/if}
					{#if vendor.funding_stage}
						<div class="fact-row">
							<span class="fact-label">Funding</span>
							<span class="fact-value" style="text-transform: capitalize">{vendor.funding_stage.replace(/-/g, ' ')}</span>
						</div>
					{/if}
					{#if vendor.pricing_starts_at}
						<div class="fact-row">
							<span class="fact-label">Pricing</span>
							<span class="fact-value">{vendor.pricing_starts_at}</span>
						</div>
					{/if}
					{#if vendor.free_trial_days > 0}
						<div class="fact-row">
							<span class="fact-label">Free Trial</span>
							<span class="fact-value">{vendor.free_trial_days} days</span>
						</div>
					{/if}
					{#if vendor.integration_count > 0}
						<div class="fact-row">
							<span class="fact-label">Integrations</span>
							<span class="fact-value">{vendor.integration_count}+</span>
						</div>
					{/if}
					{#if vendor.avg_rating}
						<div class="fact-row">
							<span class="fact-label">Rating</span>
							<span class="fact-value">⭐ {vendor.avg_rating}</span>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Features -->
			{#if features.length > 0}
				<Card>
					<h2>Features</h2>
					<div class="feature-list">
						{#each features as f}
							<span class="feature-chip">{f}</span>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- Compliance -->
			{#if certs.length > 0}
				<Card>
					<h2>Compliance</h2>
					<div class="cert-list">
						{#each certs as cert}
							<span class="cert-chip">{cert}</span>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- Add to Project -->
			<Card>
				<Button variant="primary" onclick={() => alert('Add to Project — coming soon')}>
					Add to Project
				</Button>
			</Card>
		</div>
	</div>
</div>

<style>
	.profile-page { max-width: 1200px; margin: 0 auto; padding: var(--space-6); }

	/* Breadcrumb */
	.breadcrumb {
		display: flex; align-items: center; gap: var(--space-2);
		font-size: 0.8125rem; margin-bottom: var(--space-4);
	}
	.breadcrumb a { color: var(--primary-600); text-decoration: none; }
	.breadcrumb a:hover { text-decoration: underline; }
	.sep { color: var(--neutral-300); }
	.current { color: var(--neutral-500); }

	/* Hero */
	.vendor-hero {
		display: flex; align-items: flex-start; gap: var(--space-5);
		margin-bottom: var(--space-6);
	}
	.hero-avatar {
		width: 64px; height: 64px; border-radius: var(--radius-lg);
		display: flex; align-items: center; justify-content: center;
		font-weight: 800; font-size: 1.75rem; color: white; flex-shrink: 0;
	}
	.hero-info { flex: 1; }
	.hero-name-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
	.hero-name-row h1 { font-size: 1.5rem; margin: 0; }
	.verified-badge {
		font-size: 0.6875rem; color: var(--success-600, #16a34a);
		font-weight: 700; padding: 2px 8px;
		background: rgba(0, 204, 150, 0.1); border-radius: 999px;
	}
	.enriched-badge {
		font-size: 0.6875rem; font-weight: 700; padding: 2px 8px;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
		color: #7c3aed; border-radius: 999px;
	}
	.tagline { color: var(--neutral-600); font-size: 0.9375rem; margin: var(--space-1) 0; }
	.hero-meta { display: flex; gap: var(--space-2); margin-top: var(--space-2); flex-wrap: wrap; }
	.meta-tag {
		font-size: 0.6875rem; font-weight: 600; padding: 2px 8px;
		background: var(--neutral-100); color: var(--neutral-600);
		border-radius: 999px; text-transform: capitalize;
	}
	.website-link {
		display: inline-block; margin-top: var(--space-2);
		font-size: 0.8125rem; color: var(--primary-600); text-decoration: none;
	}
	.website-link:hover { text-decoration: underline; }

	/* Grid */
	.profile-grid {
		display: grid;
		grid-template-columns: 1.5fr 1fr;
		gap: var(--space-5);
	}

	.col-left, .col-right { display: flex; flex-direction: column; gap: var(--space-4); }

	/* Sections */
	.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
	h2 { font-size: 0.9375rem; font-weight: 700; margin-bottom: var(--space-3); }

	.overview-text { font-size: 0.9375rem; color: var(--neutral-700); line-height: 1.6; }
	.about-text { font-size: 0.875rem; color: var(--neutral-600); line-height: 1.5; }
	.best-for { font-size: 0.8125rem; color: var(--neutral-500); margin-top: var(--space-2); }
	.empty-hint { font-size: 0.875rem; color: var(--neutral-400); }

	/* Strengths */
	.strength-list {
		list-style: none; padding: 0; margin: 0;
		display: flex; flex-direction: column; gap: var(--space-2);
	}
	.strength-list li {
		font-size: 0.875rem; color: var(--neutral-700);
		padding: var(--space-2) var(--space-3);
		background: rgba(0, 204, 150, 0.05);
		border-radius: var(--radius-md);
	}

	/* Intelligence */
	.intel-grid { display: flex; flex-direction: column; gap: var(--space-3); }
	.intel-item { display: flex; gap: var(--space-3); }
	.intel-icon { font-size: 1.125rem; flex-shrink: 0; margin-top: 2px; }
	.intel-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--neutral-400); }
	.intel-value { font-size: 0.8125rem; color: var(--neutral-700); margin: 2px 0; }

	.complexity { font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; }
	.complexity.low { color: #16a34a; }
	.complexity.medium { color: #d97706; }
	.complexity.high { color: #dc2626; }

	/* Competitors */
	.competitor-chips { display: flex; gap: var(--space-2); flex-wrap: wrap; }
	.competitor-chip {
		font-size: 0.8125rem; padding: var(--space-1) var(--space-3);
		background: var(--neutral-100); color: var(--neutral-600);
		border-radius: var(--radius-md);
	}

	/* Facts */
	.facts-list { display: flex; flex-direction: column; gap: 0; }
	.fact-row {
		display: flex; justify-content: space-between; align-items: center;
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--neutral-100);
	}
	.fact-row:last-child { border-bottom: none; }
	.fact-label { font-size: 0.8125rem; color: var(--neutral-500); }
	.fact-value { font-size: 0.8125rem; font-weight: 600; color: var(--neutral-800); }

	/* Features & Certs */
	.feature-list, .cert-list { display: flex; gap: var(--space-2); flex-wrap: wrap; }
	.feature-chip {
		font-size: 0.75rem; padding: var(--space-1) var(--space-2);
		background: var(--primary-50); color: var(--primary-700);
		border-radius: var(--radius-sm);
	}
	.cert-chip {
		font-size: 0.75rem; font-weight: 600; padding: var(--space-1) var(--space-2);
		background: rgba(0, 204, 150, 0.08); color: #00cc96;
		border-radius: var(--radius-sm);
	}

	/* Data meta */
	.data-meta {
		font-size: 0.75rem; color: var(--neutral-400);
		padding: var(--space-2) 0;
	}

	@media (max-width: 768px) {
		.profile-grid { grid-template-columns: 1fr; }
		.vendor-hero { flex-direction: column; gap: var(--space-3); }
		.hero-avatar { width: 48px; height: 48px; font-size: 1.25rem; }
	}
</style>
