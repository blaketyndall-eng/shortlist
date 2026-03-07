<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import VendorCard from '$components/vendor/VendorCard.svelte';
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import LoadingSpinner from '$components/ui/LoadingSpinner.svelte';

	let { data } = $props();

	let searchInput = $state(data.search);
	let activeCategory = $state(data.category);
	let loading = $state(false);

	// Compare mode
	let compareIds = $state<Set<string>>(new Set());
	let compareMode = $state(false);

	function toggleCompare(id: string) {
		const next = new Set(compareIds);
		if (next.has(id)) {
			next.delete(id);
		} else if (next.size < 4) {
			next.add(id);
		}
		compareIds = next;
	}

	function goToCompare() {
		if (compareIds.size < 2) return;
		goto(`/discover/compare?ids=${[...compareIds].join(',')}`);
	}

	// AI search state
	let aiSearchQuery = $state('');
	let aiLoading = $state(false);
	let aiResults = $state<any[] | null>(null);

	// Category name mapping
	const catNames = $derived.by(() => {
		const map = new Map<string, string>();
		for (const cat of data.categories) {
			map.set(cat.slug, cat.name);
		}
		return map;
	});

	function navigate(overrides: Record<string, string> = {}) {
		const params = new URLSearchParams();
		const cat = overrides.category ?? activeCategory;
		const q = overrides.q ?? searchInput;
		const pg = overrides.page ?? '1';
		if (cat) params.set('category', cat);
		if (q) params.set('q', q);
		if (pg !== '1') params.set('page', pg);
		goto(`/discover?${params}`, { invalidateAll: true });
	}

	function selectCategory(slug: string) {
		activeCategory = slug;
		navigate({ category: slug, page: '1' });
	}

	function doSearch() {
		navigate({ q: searchInput, page: '1' });
	}

	function handleSearchKey(e: KeyboardEvent) {
		if (e.key === 'Enter') doSearch();
	}

	function nextPage() {
		navigate({ page: String(data.page + 1) });
	}

	function prevPage() {
		if (data.page > 1) navigate({ page: String(data.page - 1) });
	}

	async function aiSearch() {
		if (!aiSearchQuery.trim()) return;
		aiLoading = true;
		aiResults = null;

		try {
			const res = await fetch('/api/ai/discovery', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: aiSearchQuery.trim(), category: activeCategory || undefined }),
			});
			if (res.ok) {
				const data = await res.json();
				aiResults = data.aiSuggestions ?? [];
			}
		} catch { /* ignore */ }
		aiLoading = false;
	}

	const totalPages = $derived(Math.ceil(data.total / data.limit));
	const hasMore = $derived(data.page < totalPages);
</script>

<svelte:head>
	<title>Discover Vendors — Shortlist</title>
</svelte:head>

<div class="discover-page">
	<header class="page-header">
		<h1>Discover Vendors</h1>
		<p>Browse our library of {data.total} verified B2B vendors or search with AI.</p>
	</header>

	<!-- Search Bar -->
	<div class="search-bar">
		<input
			type="text"
			placeholder="Search vendors by name, category, or use case..."
			bind:value={searchInput}
			onkeydown={handleSearchKey}
		/>
		<Button variant="primary" onclick={doSearch}>Search</Button>
	</div>

	<!-- Category Tabs -->
	<div class="category-tabs">
		<button
			class="cat-tab"
			class:active={!activeCategory}
			onclick={() => selectCategory('')}
		>
			All
		</button>
		{#each data.categories as cat (cat.id)}
			<button
				class="cat-tab"
				class:active={activeCategory === cat.slug}
				onclick={() => selectCategory(cat.slug)}
			>
				<span class="cat-icon">{cat.icon}</span>
				{cat.name}
				{#if cat.vendor_count > 0}
					<span class="cat-count">{cat.vendor_count}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Results -->
	{#if data.vendors.length > 0}
		<div class="results-header">
			<p class="results-meta">
				Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total} vendors
				{#if data.search}
					for "{data.search}"
				{/if}
				{#if activeCategory}
					in {catNames.get(activeCategory) ?? activeCategory}
				{/if}
			</p>
			<button class="compare-toggle" class:active={compareMode} onclick={() => { compareMode = !compareMode; if (!compareMode) compareIds = new Set(); }} type="button">
				{compareMode ? 'Cancel compare' : 'Compare vendors'}
			</button>
		</div>

		<div class="vendor-grid">
			{#each data.vendors as vendor (vendor.id)}
				<div class="vendor-grid-item" class:compare-selected={compareIds.has(vendor.id)}>
					{#if compareMode}
						<button
							class="compare-check"
							class:checked={compareIds.has(vendor.id)}
							onclick={(e) => { e.stopPropagation(); toggleCompare(vendor.id); }}
							type="button"
							disabled={!compareIds.has(vendor.id) && compareIds.size >= 4}
							aria-label="Select {vendor.name} for comparison"
						>
							{compareIds.has(vendor.id) ? '✓' : ''}
						</button>
					{/if}
					<VendorCard {vendor} categoryName={catNames.get(vendor.category_id)} />
				</div>
			{/each}
		</div>

		<!-- Compare floating bar -->
		{#if compareMode && compareIds.size >= 1}
			<div class="compare-bar">
				<span>{compareIds.size} vendor{compareIds.size === 1 ? '' : 's'} selected</span>
				<Button variant="primary" size="sm" onclick={goToCompare} disabled={compareIds.size < 2}>
					Compare now →
				</Button>
			</div>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<Button variant="ghost" onclick={prevPage} disabled={data.page <= 1}>← Previous</Button>
				<span class="page-info">Page {data.page} of {totalPages}</span>
				<Button variant="ghost" onclick={nextPage} disabled={!hasMore}>Next →</Button>
			</div>
		{/if}
	{:else}
		<Card>
			<div class="empty-results">
				<p>No vendors found{data.search ? ` matching "${data.search}"` : ''}.</p>
				<p class="hint">Try broader terms or a different category.</p>
			</div>
		</Card>
	{/if}

	<!-- AI Discovery Section -->
	<section class="ai-section">
		<h2>AI-Powered Discovery</h2>
		<p class="section-hint">Describe what you need and AI will suggest vendors — even ones not yet in our library.</p>
		<div class="ai-search-bar">
			<input
				type="text"
				placeholder="e.g., 'I need a CRM that integrates with Slack for a 50-person sales team'"
				bind:value={aiSearchQuery}
				onkeydown={(e) => { if (e.key === 'Enter') aiSearch(); }}
			/>
			<Button variant="secondary" onclick={aiSearch} loading={aiLoading}>Ask AI</Button>
		</div>

		{#if aiLoading}
			<LoadingSpinner message="Generating AI vendor suggestions..." />
		{:else if aiResults && aiResults.length > 0}
			<div class="vendor-grid" style="margin-top: var(--space-4)">
				{#each aiResults as vendor, i (i)}
					<Card>
						<div class="ai-card">
							<div class="ai-card-top">
								<h3>{vendor.name}</h3>
								<span class="ai-badge">AI</span>
							</div>
							<p class="ai-desc">{vendor.description}</p>
							<div class="ai-meta">
								{#if vendor.category}
									<span class="tag">{vendor.category}</span>
								{/if}
								{#if vendor.estimatedSize}
									<span class="tag size">{vendor.estimatedSize}</span>
								{/if}
							</div>
							{#if vendor.strengths?.length > 0}
								<div class="strengths">
									{#each vendor.strengths as s}
										<span class="strength-chip">{s}</span>
									{/each}
								</div>
							{/if}
							{#if vendor.website}
								<a
									href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
									target="_blank"
									rel="noopener"
									class="vendor-link"
								>
									{vendor.website} ↗
								</a>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{:else if aiResults && aiResults.length === 0}
			<p class="hint" style="margin-top: var(--space-3)">No AI suggestions found. Try a different query.</p>
		{/if}
	</section>
</div>

<style>
	.discover-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header { margin-bottom: var(--space-5); }
	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin: 0; }

	/* Search */
	.search-bar {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.search-bar input {
		flex: 1;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--color-bg-secondary);
		color: var(--neutral-800);
	}

	.search-bar input:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	/* Category Tabs */
	.category-tabs {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-5);
		overflow-x: auto;
		padding-bottom: var(--space-2);
		-ms-overflow-style: none;
		scrollbar-width: thin;
	}

	.cat-tab {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: 999px;
		background: var(--color-bg-secondary);
		color: var(--neutral-600);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--transition-fast);
	}

	.cat-tab:hover { border-color: var(--primary-300); color: var(--primary-600); }
	.cat-tab.active {
		background: var(--primary-50);
		border-color: var(--primary-300);
		color: var(--primary-700);
		font-weight: 600;
	}

	.cat-icon { font-size: 0.875rem; }
	.cat-count {
		font-size: 0.625rem;
		background: var(--neutral-200);
		color: var(--neutral-600);
		padding: 1px 6px;
		border-radius: 999px;
		font-weight: 700;
	}
	.cat-tab.active .cat-count {
		background: var(--primary-200);
		color: var(--primary-800);
	}

	/* Results */
	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.results-meta {
		font-size: 0.8125rem;
		color: var(--neutral-500);
		margin: 0;
	}

	.compare-toggle {
		padding: var(--space-1) var(--space-3);
		font-size: 0.8125rem;
		font-weight: 600;
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--primary-600);
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.compare-toggle:hover { border-color: var(--primary-400); }
	.compare-toggle.active {
		background: var(--primary-50);
		border-color: var(--primary-300);
		color: var(--primary-700);
	}

	.vendor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.vendor-grid-item {
		position: relative;
	}
	.vendor-grid-item.compare-selected {
		outline: 2px solid var(--primary-400);
		border-radius: var(--radius-lg);
	}

	.compare-check {
		position: absolute;
		top: 8px; right: 8px;
		z-index: 2;
		width: 24px; height: 24px;
		border-radius: 50%;
		border: 2px solid var(--neutral-300);
		background: var(--color-bg-secondary);
		color: transparent;
		font-size: 0.75rem; font-weight: 700;
		cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: all 0.15s ease;
	}
	.compare-check:hover { border-color: var(--primary-400); }
	.compare-check.checked {
		background: var(--primary-600);
		border-color: var(--primary-600);
		color: white;
	}
	.compare-check:disabled { opacity: 0.3; cursor: not-allowed; }

	.compare-bar {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-3) var(--space-5);
		display: flex;
		align-items: center;
		gap: var(--space-4);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		z-index: 50;
		font-size: 0.875rem;
		color: var(--neutral-600);
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-4);
		margin-top: var(--space-6);
	}

	.page-info {
		font-size: 0.875rem;
		color: var(--neutral-500);
	}

	/* AI Section */
	.ai-section {
		margin-top: var(--space-8);
		padding-top: var(--space-6);
		border-top: 1px solid var(--neutral-200);
	}

	.ai-section h2 {
		font-size: 1.125rem;
		margin-bottom: var(--space-1);
	}

	.section-hint {
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-bottom: var(--space-3);
	}

	.ai-search-bar {
		display: flex;
		gap: var(--space-2);
	}

	.ai-search-bar input {
		flex: 1;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--color-bg-secondary);
		color: var(--neutral-800);
	}

	.ai-search-bar input:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	/* AI Cards */
	.ai-card { display: flex; flex-direction: column; gap: var(--space-2); }
	.ai-card-top { display: flex; justify-content: space-between; align-items: center; }
	.ai-card-top h3 { font-size: 0.9375rem; margin: 0; }
	.ai-badge {
		font-size: 0.625rem; padding: 2px 6px;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		color: white; border-radius: 9999px; font-weight: 700;
		letter-spacing: 0.05em;
	}
	.ai-desc { font-size: 0.8125rem; color: var(--neutral-600); line-height: 1.4; margin: 0; }
	.ai-meta { display: flex; gap: var(--space-2); flex-wrap: wrap; }

	.tag {
		font-size: 0.6875rem; padding: 2px 8px;
		background: var(--neutral-100); color: var(--neutral-600);
		border-radius: 9999px; text-transform: capitalize;
	}
	.tag.size { background: var(--primary-50); color: var(--primary-700); }

	.strengths { display: flex; gap: var(--space-1); flex-wrap: wrap; }
	.strength-chip {
		font-size: 0.6875rem; padding: 2px 8px;
		background: #f0fdf4; color: #16a34a; border-radius: 9999px;
	}
	.vendor-link {
		font-size: 0.8125rem; color: var(--primary-600); text-decoration: none;
	}
	.vendor-link:hover { text-decoration: underline; }

	.empty-results {
		text-align: center; padding: var(--space-6); color: var(--neutral-500);
	}
	.hint { font-size: 0.8125rem; color: var(--neutral-400); }

	@media (max-width: 768px) {
		.vendor-grid { grid-template-columns: 1fr; }
	}

	@media (max-width: 640px) {
		.search-bar { flex-direction: column; }
	}
</style>
