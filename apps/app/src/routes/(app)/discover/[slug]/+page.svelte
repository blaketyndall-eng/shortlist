<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { data } = $props();

	const vendor = data.vendor;
	const category = data.category;
	let enriching = $state(false);
	const supabase = createSupabaseBrowserClient();
	let projects = $state<any[]>([]);
	let showAddModal = $state(false);
	let addingToProject = $state(false);
	let addedToProject = $state<string | null>(null);

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

	$effect(() => {
		supabase.from('projects').select('id, name, state, current_step').order('updated_at', { ascending: false }).then(({ data: projectData }) => {
			if (projectData) projects = projectData;
		});
	});

	async function addToProject(projectId: string) {
		addingToProject = true;
		const project = projects.find(p => p.id === projectId);
		if (!project) {
			addingToProject = false;
			return;
		}

		const existingVendors = project.state?.vendors ?? [];

		// Check if vendor already added
		if (existingVendors.some((v: any) => v.name.toLowerCase() === vendor.name.toLowerCase())) {
			addedToProject = projectId;
			addingToProject = false;
			return;
		}

		const newVendor = {
			id: crypto.randomUUID(),
			name: vendor.name,
			vendorProfileId: vendor.id,
			website: vendor.website || null,
			notes: null,
			addedAt: new Date().toISOString()
		};

		const updatedState = {
			...project.state,
			vendors: [...existingVendors, newVendor]
		};

		await supabase
			.from('projects')
			.update({ state: updatedState, updated_at: new Date().toISOString() })
			.eq('id', projectId);

		addedToProject = projectId;
		addingToProject = false;
		showAddModal = false;
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
	const targetSegments = parseArr(vendor.ai_target_segments);
	const keyIntegrations = parseArr(vendor.ai_key_integrations);
	const securityCerts = parseArr(vendor.ai_security_certs);
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

			<!-- Extended Intelligence: Contract, Deployment, Support, Stability -->
			{#if vendor.ai_contract_terms || vendor.ai_deployment_model || vendor.ai_support_model || vendor.ai_vendor_stability || vendor.ai_impl_timeline}
				<Card>
					<h2>Purchase Intelligence</h2>
					<div class="intel-grid">
						{#if vendor.ai_impl_timeline}
							<div class="intel-item">
								<span class="intel-icon">⏱️</span>
								<div>
									<span class="intel-label">Implementation Timeline</span>
									<p class="intel-value">{vendor.ai_impl_timeline}</p>
								</div>
							</div>
						{/if}
						{#if vendor.ai_contract_terms}
							<div class="intel-item">
								<span class="intel-icon">📝</span>
								<div>
									<span class="intel-label">Contract Terms</span>
									<p class="intel-value">{vendor.ai_contract_terms}</p>
								</div>
							</div>
						{/if}
						{#if vendor.ai_deployment_model}
							<div class="intel-item">
								<span class="intel-icon">☁️</span>
								<div>
									<span class="intel-label">Deployment</span>
									<p class="intel-value" style="text-transform: capitalize">{vendor.ai_deployment_model.replace(/-/g, ' ')}</p>
								</div>
							</div>
						{/if}
						{#if vendor.ai_support_model}
							<div class="intel-item">
								<span class="intel-icon">🎧</span>
								<div>
									<span class="intel-label">Support</span>
									<p class="intel-value">{vendor.ai_support_model}</p>
								</div>
							</div>
						{/if}
						{#if vendor.ai_vendor_stability}
							<div class="intel-item">
								<span class="intel-icon">📈</span>
								<div>
									<span class="intel-label">Vendor Stability</span>
									<p class="intel-value">{vendor.ai_vendor_stability}</p>
								</div>
							</div>
						{/if}
					</div>
				</Card>
			{/if}

			<!-- Key Integrations -->
			{#if keyIntegrations.length > 0}
				<Card>
					<h2>Key Integrations</h2>
					<div class="competitor-chips">
						{#each keyIntegrations as i}
							<span class="feature-chip">{i}</span>
						{/each}
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

			<!-- Target Customer Segments -->
			{#if targetSegments.length > 0}
				<Card>
					<h2>Target Segments</h2>
					<div class="competitor-chips">
						{#each targetSegments as s}
							<span class="competitor-chip">{s}</span>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- Data Confidence (Pillar 5 — intelligence transparency) -->
			{#if vendor.enrichment_status === 'enriched' && vendor.trust_tier}
				<Card>
					<h2>Data Confidence</h2>
					<div class="confidence-grid">
						<div class="confidence-row">
							<span class="conf-label">Trust Tier</span>
							<span class="conf-value conf-tier" class:verified={vendor.trust_tier === 'verified'} class:provisional={vendor.trust_tier === 'provisional'} class:pending-tier={vendor.trust_tier === 'pending'}>
								{vendor.trust_tier}
							</span>
						</div>
						{#if vendor.enriched_at}
							<div class="confidence-row">
								<span class="conf-label">Last Enriched</span>
								<span class="conf-value">{new Date(vendor.enriched_at).toLocaleDateString()}</span>
							</div>
						{/if}
						{#if vendor.data_sources?.length}
							<div class="confidence-row">
								<span class="conf-label">Data Sources</span>
								<span class="conf-value">{parseArr(vendor.data_sources).length} source{parseArr(vendor.data_sources).length !== 1 ? 's' : ''}</span>
							</div>
						{/if}
					</div>
					<p class="confidence-note">AI-enriched fields are research-grade estimates. Verify critical data points with the vendor directly.</p>
				</Card>
			{/if}

			<!-- Data Sources (fallback for no trust tier) -->
			{#if vendor.enriched_at && !vendor.trust_tier}
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
			{#if certs.length > 0 || securityCerts.length > 0}
				<Card>
					<h2>Security & Compliance</h2>
					<div class="cert-list">
						{#each securityCerts as cert}
							<span class="cert-chip">{cert}</span>
						{/each}
						{#each certs.filter((c) => !securityCerts.includes(c)) as cert}
							<span class="cert-chip">{cert}</span>
						{/each}
					</div>
				</Card>
			{/if}

			<!-- Pricing Model -->
			{#if vendor.ai_pricing_model}
				<Card>
					<h2>Pricing Model</h2>
					<span class="meta-tag" style="text-transform: capitalize">{vendor.ai_pricing_model.replace(/-/g, ' ')}</span>
				</Card>
			{/if}

			<!-- Add to Project -->
			<Card>
				{#if addedToProject}
					<div class="added-success">
						<span class="success-icon">✓</span>
						<span>Added to project</span>
						<a href="/project/{addedToProject}/setup" class="project-link">View Project →</a>
					</div>
				{:else}
					<Button variant="primary" onclick={() => showAddModal = true}>
						Add to Project
					</Button>
				{/if}
			</Card>
		</div>
	</div>
</div>

{#if showAddModal}
	<div class="modal-overlay" onclick={() => showAddModal = false} role="dialog" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (showAddModal = false)}>
		<div class="modal-panel" onclick={(e) => e.stopPropagation()} role="document">
			<h3>Add {vendor.name} to a project</h3>
			{#if projects.length === 0}
				<p class="modal-empty">No projects yet.</p>
				<Button variant="primary" onclick={() => goto('/project/new')}>Create a Project</Button>
			{:else}
				<div class="project-picker">
					{#each projects as p}
						<button class="picker-item" onclick={() => addToProject(p.id)} disabled={addingToProject}>
							<span class="picker-name">{p.name}</span>
							<span class="picker-step">{p.current_step ?? 'setup'}</span>
						</button>
					{/each}
				</div>
			{/if}
			<button class="modal-close" onclick={() => showAddModal = false}>Cancel</button>
		</div>
	</div>
{/if}

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

	/* Data confidence */
	.confidence-grid { display: flex; flex-direction: column; gap: 0; }
	.confidence-row {
		display: flex; justify-content: space-between; align-items: center;
		padding: var(--space-2) 0; border-bottom: 1px solid var(--neutral-100);
	}
	.confidence-row:last-child { border-bottom: none; }
	.conf-label { font-size: 0.8125rem; color: var(--neutral-500); }
	.conf-value { font-size: 0.8125rem; font-weight: 600; color: var(--neutral-800); }
	.conf-tier { text-transform: capitalize; font-weight: 700; }
	.conf-tier.verified { color: #16a34a; }
	.conf-tier.provisional { color: #d97706; }
	.conf-tier.pending-tier { color: var(--neutral-400); }
	.confidence-note { font-size: 0.75rem; color: var(--neutral-400); margin-top: var(--space-2); font-style: italic; }

	/* Data meta */
	.data-meta {
		font-size: 0.75rem; color: var(--neutral-400);
		padding: var(--space-2) 0;
	}

	/* Add to Project modal */
	.added-success {
		display: flex; align-items: center; gap: var(--space-2);
		font-size: 0.875rem; color: var(--success-600, #16a34a);
	}
	.success-icon { font-size: 1.125rem; }
	.project-link { color: var(--primary-600); text-decoration: none; margin-left: auto; }
	.project-link:hover { text-decoration: underline; }

	.modal-overlay {
		position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
		display: flex; align-items: center; justify-content: center; z-index: 100;
	}
	.modal-panel {
		background: var(--color-bg-secondary, #131920); border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg); padding: var(--space-6); width: 400px; max-width: 90vw;
	}
	.modal-panel h3 { margin-bottom: var(--space-4); font-size: 1.125rem; }
	.modal-empty { color: var(--neutral-400); margin-bottom: var(--space-3); }
	.project-picker { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
	.picker-item {
		display: flex; justify-content: space-between; align-items: center;
		padding: var(--space-3); background: rgba(255,255,255,0.04);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
		cursor: pointer; color: inherit; font-size: 0.9375rem; text-align: left;
	}
	.picker-item:hover { background: rgba(74, 150, 248, 0.08); border-color: var(--primary-500); }
	.picker-name { font-weight: 500; }
	.picker-step { font-size: 0.75rem; color: var(--neutral-400); text-transform: capitalize; }
	.modal-close {
		display: block; margin: 0 auto; background: none; border: none;
		color: var(--neutral-400); cursor: pointer; font-size: 0.875rem;
		padding: var(--space-2) var(--space-4);
	}
	.modal-close:hover { color: var(--neutral-600); }

	@media (max-width: 768px) {
		.profile-grid { grid-template-columns: 1fr; }
		.vendor-hero { flex-direction: column; gap: var(--space-3); }
		.hero-avatar { width: 48px; height: 48px; font-size: 1.25rem; }
	}
</style>
