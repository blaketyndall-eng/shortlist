<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';

	let { data } = $props();
	const project = data.project;
	const state = project?.state ?? {};
	const solveData = project?.solve_data ?? {};
	const projectId = $derived($page.params.id);

	const vendors = state.vendors ?? [];
	const scores = state.scores ?? {};
	const weights = state.weights ?? {};
	const criteria = state.criteria ?? [];

	// Vendor profiles from SOLVE
	const vendorProfiles = solveData.vendorProfiles ?? {};
	const shortlistedVendors = (solveData.discoveredVendors ?? []).filter((v: any) =>
		(solveData.shortlistedVendorIds ?? []).includes(v.id)
	);

	let filterText = $state('');

	const filteredVendors = $derived(
		vendors.filter((v: string) => v.toLowerCase().includes(filterText.toLowerCase()))
	);

	function calcScore(vendor: string): number {
		const vs = scores[vendor] ?? {};
		let total = 0;
		let wSum = 0;
		for (const c of criteria) {
			const w = weights[c] ?? 0;
			const s = vs[c] ?? 0;
			total += s * w;
			wSum += w;
		}
		return wSum > 0 ? total / wSum : 0;
	}

	function getProfile(vendorName: string): any {
		// Check SOLVE-derived profiles
		return shortlistedVendors.find((v: any) => v.name === vendorName) ?? vendorProfiles[vendorName] ?? null;
	}

	function getDemoCount(vendorName: string): number {
		return (solveData.demoSessions ?? []).filter((d: any) => d.vendorName === vendorName).length;
	}
</script>

<svelte:head>
	<title>Vendors — {project?.name} — Shortlist</title>
</svelte:head>

<div class="vendors-tab">
	<div class="vendors-header">
		<div class="vendors-meta">
			<span>{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} in evaluation</span>
		</div>
		<input
			type="text"
			class="vendor-filter"
			placeholder="Filter vendors..."
			bind:value={filterText}
		/>
	</div>

	{#if filteredVendors.length > 0}
		<div class="vendor-grid">
			{#each filteredVendors as vendor, i (vendor)}
				{@const profile = getProfile(vendor)}
				{@const score = calcScore(vendor)}
				{@const demos = getDemoCount(vendor)}
				<a href="/project/{projectId}/vendor/{i}" class="vendor-card">
					<div class="vc-header">
						<div class="vc-avatar">{vendor.charAt(0)}</div>
						<div class="vc-info">
							<h3 class="vc-name">{vendor}</h3>
							{#if profile?.tier}
								<span class="vc-tier">{profile.tier}</span>
							{/if}
						</div>
						{#if score > 0}
							<div class="vc-score" class:high={score >= 7} class:mid={score >= 4 && score < 7} class:low={score < 4}>
								{score.toFixed(1)}
							</div>
						{/if}
					</div>

					{#if profile?.tagline || profile?.overview}
						<p class="vc-desc">{profile.tagline ?? profile.overview ?? ''}</p>
					{/if}

					<div class="vc-footer">
						{#if demos > 0}
							<span class="vc-badge">{demos} demo{demos !== 1 ? 's' : ''}</span>
						{/if}
						{#if profile?.bestFor}
							<span class="vc-badge accent">{profile.bestFor}</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{:else if vendors.length === 0}
		<Card>
			<div class="empty-state">
				<p>No vendors added yet. Add vendors through the setup page or complete the SOLVE workflow.</p>
				<Button variant="secondary" size="sm" onclick={() => window.location.href = `/project/${projectId}/setup`}>
					Go to Setup →
				</Button>
			</div>
		</Card>
	{:else}
		<Card>
			<div class="empty-state">
				<p>No vendors match "{filterText}"</p>
			</div>
		</Card>
	{/if}
</div>

<style>
	.vendors-tab { display: flex; flex-direction: column; gap: var(--space-4); }

	.vendors-header {
		display: flex; justify-content: space-between; align-items: center;
		gap: var(--space-3); flex-wrap: wrap;
	}
	.vendors-meta { font-size: 0.875rem; color: var(--neutral-500); }

	.vendor-filter {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.875rem; width: 220px;
	}
	.vendor-filter:focus { outline: var(--focus-ring); border-color: var(--primary-500); }

	.vendor-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-3);
	}

	.vendor-card {
		display: flex; flex-direction: column; gap: var(--space-2);
		padding: var(--space-4); background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-lg);
		text-decoration: none; color: inherit;
		transition: border-color 0.15s, box-shadow 0.15s;
	}
	.vendor-card:hover {
		border-color: var(--primary-300);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.vc-header { display: flex; align-items: center; gap: var(--space-2); }
	.vc-avatar {
		width: 36px; height: 36px; border-radius: var(--radius-md);
		background: var(--primary-50, #eef2ff); color: var(--primary-600);
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 0.875rem; flex-shrink: 0;
	}
	.vc-info { flex: 1; min-width: 0; }
	.vc-name {
		font-size: 0.9375rem; font-weight: 600; color: var(--neutral-800);
		margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.vc-tier {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; color: var(--neutral-400);
	}

	.vc-score {
		font-size: 0.9375rem; font-weight: 800; padding: 2px 8px;
		border-radius: var(--radius-sm); flex-shrink: 0;
	}
	.vc-score.high { background: rgba(0, 204, 150, 0.1); color: #00cc96; }
	.vc-score.mid { background: rgba(245, 158, 11, 0.1); color: #d97706; }
	.vc-score.low { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

	.vc-desc {
		font-size: 0.8125rem; color: var(--neutral-500); line-height: 1.5;
		margin: 0;
		display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
		overflow: hidden;
	}

	.vc-footer { display: flex; gap: var(--space-1); flex-wrap: wrap; }
	.vc-badge {
		font-size: 0.6875rem; font-weight: 600; padding: 2px 8px;
		background: var(--neutral-100); color: var(--neutral-500);
		border-radius: 999px;
	}
	.vc-badge.accent { background: rgba(74, 150, 248, 0.08); color: #4a96f8; }

	.empty-state {
		text-align: center; padding: var(--space-4);
		color: var(--neutral-500); font-size: 0.875rem;
	}
	.empty-state p { margin-bottom: var(--space-3); }

	@media (max-width: 640px) {
		.vendor-filter { width: 100%; }
	}
</style>
