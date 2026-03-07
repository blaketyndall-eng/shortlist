<script lang="ts">
	import { goto } from '$app/navigation';
	import VendorCompare from '$lib/components/vendor/VendorCompare.svelte';
	import Button from '$components/ui/Button.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();

	let vendors = $state(data.vendors ?? []);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searching = $state(false);
	let searchError = $state('');

	function removeVendor(id: string) {
		vendors = vendors.filter((v: any) => v.id !== id);
		updateUrl();
	}

	function updateUrl() {
		const ids = vendors.map((v: any) => v.id).join(',');
		if (ids) {
			goto(`/discover/compare?ids=${ids}`, { replaceState: true, keepFocus: true });
		}
	}

	async function searchVendors() {
		if (!searchQuery.trim()) return;
		searching = true;
		searchError = '';
		try {
			// Sanitize input for PostgREST .or() filter
			const q = searchQuery.trim().replace(/['"\\%_(),.]/g, '');
			if (!q) { searching = false; return; }

			const { data: results, error: err } = await supabase
				.from('vendor_library')
				.select('id, name, slug, tagline, category_id, tier')
				.or(`name.ilike.%${q}%,tagline.ilike.%${q}%,category_id.ilike.%${q}%`)
				.limit(10);

			if (err) {
				searchError = 'Search failed. Try a different query.';
			} else {
				searchResults = (results ?? []).filter(
					(r: any) => !vendors.some((v: any) => v.id === r.id)
				);
				if (searchResults.length === 0) {
					searchError = 'No vendors found. Try a different search term.';
				}
			}
		} catch {
			searchError = 'Search failed. Please try again.';
		}
		searching = false;
	}

	async function addVendor(result: any) {
		// Fetch full vendor data
		const { data: fullVendor } = await supabase
			.from('vendor_library')
			.select('*')
			.eq('id', result.id)
			.single();

		if (fullVendor) {
			vendors = [...vendors, fullVendor];
			searchResults = searchResults.filter((r: any) => r.id !== result.id);
			searchQuery = '';
			updateUrl();
		}
	}
</script>

<svelte:head>
	<title>Compare Vendors — Shortlist</title>
</svelte:head>

<div class="compare-page">
	<div class="page-top">
		<Button variant="ghost" onclick={() => goto('/discover')}>← Back to Discover</Button>
	</div>

	{#if vendors.length < 2}
		<div class="empty-state">
			<h2>Compare Vendors</h2>
			<p>Select at least 2 vendors to compare side-by-side. You have {vendors.length} selected.</p>
		</div>
	{/if}

	{#if vendors.length < 4}
		<div class="add-vendor-section">
			<div class="search-row">
				<input
					type="text"
					placeholder="Search vendors to add to comparison..."
					bind:value={searchQuery}
					onkeydown={(e) => { if (e.key === 'Enter') searchVendors(); }}
					class="search-input"
				/>
				<Button variant="secondary" size="sm" onclick={searchVendors} loading={searching}>
					Search
				</Button>
			</div>

			{#if searchResults.length > 0}
				<div class="search-results">
					{#each searchResults as result (result.id)}
						<button class="search-result" onclick={() => addVendor(result)} type="button">
							<span class="result-name">{result.name}</span>
							<span class="result-category">{result.category_id?.replace(/-/g, ' ') ?? ''}</span>
							<span class="add-label">+ Add</span>
						</button>
					{/each}
				</div>
			{/if}

			{#if searchError}
				<p class="search-error">{searchError}</p>
			{/if}
		</div>
	{/if}

	{#if vendors.length >= 2}
		<VendorCompare
			{vendors}
			onRemove={removeVendor}
		/>
	{:else if vendors.length === 1}
		<div class="single-vendor">
			<p>Add at least one more vendor to start comparing.</p>
			<div class="selected-vendor">
				<span class="selected-name">{vendors[0].name}</span>
				<button class="remove-btn" onclick={() => removeVendor(vendors[0].id)} type="button">Remove</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.compare-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-top { margin-bottom: var(--space-4); }

	.empty-state {
		text-align: center;
		padding: var(--space-6);
		color: var(--neutral-500);
	}
	.empty-state h2 { margin-bottom: var(--space-2); color: var(--neutral-800); }

	.add-vendor-section {
		margin-bottom: var(--space-5);
	}

	.search-row {
		display: flex;
		gap: var(--space-2);
	}

	.search-input {
		flex: 1;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--color-bg-secondary);
		color: inherit;
	}
	.search-input:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.search-results {
		margin-top: var(--space-2);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.search-result {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2) var(--space-4);
		border: none;
		border-bottom: 1px solid var(--neutral-100);
		background: var(--color-bg-secondary);
		cursor: pointer;
		text-align: left;
		color: inherit;
		transition: background 0.1s ease;
	}
	.search-result:last-child { border-bottom: none; }
	.search-result:hover { background: rgba(74, 150, 248, 0.04); }

	.result-name { font-weight: 600; font-size: 0.9375rem; }
	.result-category { font-size: 0.75rem; color: var(--neutral-500); text-transform: capitalize; flex: 1; }
	.add-label { font-size: 0.75rem; color: #00cc96; font-weight: 600; }

	.single-vendor {
		text-align: center;
		padding: var(--space-5);
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
	}
	.single-vendor p { color: var(--neutral-500); margin-bottom: var(--space-3); }

	.selected-vendor {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
	}
	.selected-name { font-weight: 600; }
	.remove-btn {
		font-size: 0.75rem; color: #ef4444;
		background: none; border: none; cursor: pointer;
	}
	.remove-btn:hover { text-decoration: underline; }

	.search-error {
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-top: var(--space-2);
	}
</style>
