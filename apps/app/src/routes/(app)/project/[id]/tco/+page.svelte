<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	interface TCOVendor {
		name: string;
		license: { year1: number; year2: number; year3: number };
		implementation: number;
		training: number;
		migration: number;
		customization: number;
		support: number;
		integration: number;
		hiddenCosts: number;
	}

	let vendors = $state<TCOVendor[]>([]);
	let showBreakdown = $state(true);
	let aiLoading = $state(false);
	let comparisonView = $state<'chart' | 'table'>('chart');

	$effect(() => {
		const proj = projectStore.currentProject;
		if (proj) {
			const state = (proj.state as Record<string, any>) ?? {};
			const vList = state.vendors ?? [];
			const existingTco = state.tcoData ?? {};
			vendors = vList.map((v: any) => {
				const saved = existingTco[v.name] ?? {};
				return {
					name: v.name,
					license: saved.license ?? { year1: 0, year2: 0, year3: 0 },
					implementation: saved.implementation ?? 0,
					training: saved.training ?? 0,
					migration: saved.migration ?? 0,
					customization: saved.customization ?? 0,
					support: saved.support ?? 0,
					integration: saved.integration ?? 0,
					hiddenCosts: saved.hiddenCosts ?? 0
				};
			});
		}
	});

	function total3Year(v: TCOVendor): number {
		return v.license.year1 + v.license.year2 + v.license.year3 +
			v.implementation + v.training + v.migration +
			v.customization + v.support + v.integration + v.hiddenCosts;
	}

	function yearTotal(v: TCOVendor, year: number): number {
		const lic = year === 1 ? v.license.year1 : year === 2 ? v.license.year2 : v.license.year3;
		if (year === 1) return lic + v.implementation + v.training + v.migration + v.customization;
		return lic + v.support + v.integration;
	}

	let rankedVendors = $derived(
		[...vendors].sort((a, b) => total3Year(a) - total3Year(b))
	);

	let maxTco = $derived(Math.max(...vendors.map(total3Year), 1));

	function formatCurrency(n: number): string {
		if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
		return `$${n.toLocaleString()}`;
	}

	function barWidth(n: number): number {
		return maxTco > 0 ? (n / maxTco) * 100 : 0;
	}

	async function saveTco() {
		const tcoData: Record<string, any> = {};
		for (const v of vendors) {
			tcoData[v.name] = {
				license: v.license,
				implementation: v.implementation,
				training: v.training,
				migration: v.migration,
				customization: v.customization,
				support: v.support,
				integration: v.integration,
				hiddenCosts: v.hiddenCosts
			};
		}
		await fetch(`/api/projects/${projectId}/tco`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tcoData })
		});
	}

	async function aiSpotCosts(vendorName: string) {
		aiLoading = true;
		try {
			const proj = projectStore.currentProject;
			const state = (proj?.state as Record<string, any>) ?? {};
			const v = vendors.find((x) => x.name === vendorName);
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'hidden_cost_spotter',
					depth: 'standard',
					projectId,
					context: {
						vendor: vendorName,
						category: state.category ?? '',
						problem: state.problem ?? '',
						teamSize: state.teamSize ?? '',
						year1Cost: v ? String(yearTotal(v, 1)) : '',
						budget: state.budget ?? '',
						license: v ? String(v.license.year1) : '',
						impl: v ? String(v.implementation) : '',
						training: v ? String(v.training) : ''
					}
				})
			});
			if (res.ok) {
				// Result shown in alert for now; could show in modal
			}
		} catch { /* */ }
		finally { aiLoading = false; }
	}

	const costCategories = [
		{ key: 'implementation', label: 'Implementation', color: '#3b82f6' },
		{ key: 'training', label: 'Training', color: '#8b5cf6' },
		{ key: 'migration', label: 'Migration', color: '#06b6d4' },
		{ key: 'customization', label: 'Customization', color: '#f59e0b' },
		{ key: 'support', label: 'Ongoing Support', color: '#10b981' },
		{ key: 'integration', label: 'Integrations', color: '#ec4899' },
		{ key: 'hiddenCosts', label: 'Hidden / Risk', color: '#ef4444' }
	];
</script>

<svelte:head>
	<title>TCO Calculator | Shortlist</title>
</svelte:head>

<div class="tco-page">
	<div class="tco-header">
		<div>
			<h1>3-Year TCO Calculator</h1>
			<p class="subtitle">Total Cost of Ownership comparison across vendors.</p>
		</div>
		<div class="header-actions">
			<button class="save-btn" onclick={saveTco}>Save TCO Data</button>
		</div>
	</div>

	{#if vendors.length === 0}
		<div class="empty">No vendors to compare. Add vendors from the Evaluate phase first.</div>
	{:else}
		<!-- Bar chart comparison -->
		<div class="tco-chart">
			<h3>3-Year Total</h3>
			{#each rankedVendors as vendor, i}
				{@const t = total3Year(vendor)}
				<div class="bar-row">
					<span class="bar-label">{vendor.name}</span>
					<div class="bar-track">
						<div class="bar-fill" style="width: {barWidth(t)}%; opacity: {1 - i * 0.15}"></div>
					</div>
					<span class="bar-value" class:lowest={i === 0 && t > 0}>{formatCurrency(t)}</span>
				</div>
			{/each}
		</div>

		<!-- Vendor cost breakdowns -->
		{#each vendors as vendor, vi}
			<div class="vendor-tco">
				<div class="vtco-header">
					<h3>{vendor.name}</h3>
					<span class="vtco-total">{formatCurrency(total3Year(vendor))}</span>
					<button class="ai-cost-btn" onclick={() => aiSpotCosts(vendor.name)} disabled={aiLoading}>
						✦ Spot Hidden Costs
					</button>
				</div>

				<div class="vtco-grid">
					<div class="vtco-section">
						<h4>License Costs</h4>
						<div class="input-row">
							<label>Year 1</label>
							<input type="number" bind:value={vendor.license.year1} min="0" step="1000" />
						</div>
						<div class="input-row">
							<label>Year 2</label>
							<input type="number" bind:value={vendor.license.year2} min="0" step="1000" />
						</div>
						<div class="input-row">
							<label>Year 3</label>
							<input type="number" bind:value={vendor.license.year3} min="0" step="1000" />
						</div>
					</div>

					<div class="vtco-section">
						<h4>One-Time Costs</h4>
						{#each [['implementation', 'Implementation'], ['training', 'Training'], ['migration', 'Migration'], ['customization', 'Customization']] as [key, label]}
							<div class="input-row">
								<label>{label}</label>
								<input type="number" bind:value={vendor[key as keyof TCOVendor]} min="0" step="500" />
							</div>
						{/each}
					</div>

					<div class="vtco-section">
						<h4>Ongoing Costs (annual)</h4>
						<div class="input-row">
							<label>Support</label>
							<input type="number" bind:value={vendor.support} min="0" step="500" />
						</div>
						<div class="input-row">
							<label>Integrations</label>
							<input type="number" bind:value={vendor.integration} min="0" step="500" />
						</div>
						<div class="input-row">
							<label>Hidden / Risk</label>
							<input type="number" bind:value={vendor.hiddenCosts} min="0" step="500" />
						</div>
					</div>
				</div>

				<!-- Year summaries -->
				<div class="year-summary">
					{#each [1, 2, 3] as yr}
						<div class="yr-card">
							<span class="yr-label">Year {yr}</span>
							<span class="yr-val">{formatCurrency(yearTotal(vendor, yr))}</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.tco-page { padding: 2rem 1.5rem; max-width: 1000px; margin: 0 auto; }
	.tco-header {
		display: flex; justify-content: space-between; align-items: flex-start;
		margin-bottom: 1.5rem;
	}
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.save-btn {
		padding: 0.45rem 1rem; background: var(--t, #00cc96); border: none;
		border-radius: 6px; color: #0b1017; font-size: 0.8rem; font-weight: 600; cursor: pointer;
	}
	.empty {
		padding: 3rem; text-align: center; color: var(--text-muted, #64748b);
		background: rgba(255, 255, 255, 0.02); border-radius: 12px;
	}
	.tco-chart {
		background: rgba(0, 0, 0, 0.15); border-radius: 12px;
		padding: 1.25rem; margin-bottom: 2rem;
	}
	.tco-chart h3 {
		margin: 0 0 1rem; font-size: 0.85rem; color: var(--text-muted, #94a3b8);
		text-transform: uppercase; letter-spacing: 0.04em;
	}
	.bar-row {
		display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem;
	}
	.bar-label {
		width: 120px; font-size: 0.82rem; color: var(--text, #e2e8f0);
		font-weight: 500; text-align: right;
	}
	.bar-track {
		flex: 1; height: 24px; background: rgba(255, 255, 255, 0.04);
		border-radius: 4px; overflow: hidden;
	}
	.bar-fill {
		height: 100%; background: var(--t, #00cc96); border-radius: 4px;
		transition: width 0.4s ease;
	}
	.bar-value {
		width: 80px; font-size: 0.85rem; font-weight: 600;
		color: var(--text-muted, #94a3b8); text-align: right;
	}
	.bar-value.lowest { color: var(--t, #00cc96); }
	.vendor-tco {
		background: rgba(0, 0, 0, 0.1); border-radius: 12px;
		padding: 1.25rem; margin-bottom: 1.25rem;
	}
	.vtco-header {
		display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
	}
	.vtco-header h3 { margin: 0; font-size: 1rem; color: var(--text, #e2e8f0); }
	.vtco-total {
		font-size: 1.1rem; font-weight: 700; color: var(--t, #00cc96);
		font-family: 'Playfair Display', serif; margin-left: auto;
	}
	.ai-cost-btn {
		padding: 0.3rem 0.65rem; background: rgba(0, 204, 150, 0.08);
		border: 1px solid rgba(0, 204, 150, 0.15); border-radius: 4px;
		color: var(--t, #00cc96); font-size: 0.7rem; cursor: pointer;
	}
	.ai-cost-btn:disabled { opacity: 0.5; }
	.vtco-grid {
		display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
	}
	.vtco-section h4 {
		margin: 0 0 0.5rem; font-size: 0.7rem; text-transform: uppercase;
		letter-spacing: 0.05em; color: var(--text-muted, #64748b); font-weight: 600;
	}
	.input-row {
		display: flex; justify-content: space-between; align-items: center;
		gap: 0.5rem; margin-bottom: 0.35rem;
	}
	.input-row label {
		font-size: 0.78rem; color: var(--text-muted, #94a3b8);
	}
	.input-row input {
		width: 100px; padding: 0.3rem 0.5rem; text-align: right;
		background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px; color: var(--text, #e2e8f0); font-size: 0.8rem;
		font-family: 'Figtree', sans-serif;
	}
	.input-row input:focus { outline: none; border-color: rgba(0, 204, 150, 0.3); }
	.year-summary {
		display: flex; gap: 0.75rem; margin-top: 1rem;
		padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.04);
	}
	.yr-card {
		flex: 1; text-align: center; padding: 0.5rem;
		background: rgba(0, 204, 150, 0.04); border-radius: 6px;
	}
	.yr-label {
		display: block; font-size: 0.65rem; text-transform: uppercase;
		color: var(--text-muted, #64748b); letter-spacing: 0.04em; margin-bottom: 0.2rem;
	}
	.yr-val {
		font-size: 1rem; font-weight: 600; color: var(--text, #e2e8f0);
		font-family: 'Playfair Display', serif;
	}
	@media (max-width: 768px) {
		.vtco-grid { grid-template-columns: 1fr; }
	}
</style>
