<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import LoadingSpinner from '$components/ui/LoadingSpinner.svelte';

	let searchQuery = $state('');
	let category = $state('');
	let loading = $state(false);
	let results = $state<{
		library: any[];
		orgIntelligence: any[];
		aiSuggestions: any[];
	} | null>(null);

	const categories = [
		{ value: '', label: 'All Categories' },
		{ value: 'software', label: 'Software' },
		{ value: 'services', label: 'Services' },
		{ value: 'hardware', label: 'Hardware' },
		{ value: 'infrastructure', label: 'Infrastructure' },
		{ value: 'marketing', label: 'Marketing' }
	];

	async function search() {
		if (!searchQuery.trim()) return;
		loading = true;
		results = null;

		try {
			const res = await fetch('/api/ai/discovery', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: searchQuery.trim(), category: category || undefined })
			});

			if (res.ok) {
				results = await res.json();
			}
		} catch {
			// Silently fail
		} finally {
			loading = false;
		}
	}

	const totalResults = $derived(
		(results?.library?.length ?? 0) +
		(results?.orgIntelligence?.length ?? 0) +
		(results?.aiSuggestions?.length ?? 0)
	);
</script>

<svelte:head>
	<title>Discover Vendors — Shortlist</title>
</svelte:head>

<div class="discover-page">
	<header class="page-header">
		<h1>Discover Vendors</h1>
		<p>Search our vendor library and get AI-powered recommendations.</p>
	</header>

	<div class="search-bar">
		<input
			type="text"
			placeholder="Search vendors, e.g., 'CRM software', 'IT consulting'..."
			bind:value={searchQuery}
			onkeydown={(e) => { if (e.key === 'Enter') search(); }}
		/>
		<select bind:value={category}>
			{#each categories as cat}
				<option value={cat.value}>{cat.label}</option>
			{/each}
		</select>
		<Button variant="primary" onclick={search} loading={loading}>Search</Button>
	</div>

	{#if loading}
		<LoadingSpinner message="Searching vendors and generating AI suggestions..." />
	{:else if results}
		<p class="results-count">{totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"</p>

		{#if results.library.length > 0}
			<section class="results-section">
				<h2>Vendor Library</h2>
				<div class="vendor-grid">
					{#each results.library as vendor (vendor.id)}
						<Card>
							<div class="vendor-card">
								<div class="vendor-top">
									<h3>{vendor.name}</h3>
									{#if vendor.is_verified}
										<span class="verified-badge">✓ Verified</span>
									{/if}
								</div>
								{#if vendor.description}
									<p class="vendor-desc">{vendor.description}</p>
								{/if}
								<div class="vendor-meta">
									{#if vendor.category}
										<span class="tag">{vendor.category}</span>
									{/if}
									{#if vendor.size}
										<span class="tag size">{vendor.size}</span>
									{/if}
									{#if vendor.avg_rating}
										<span class="rating">⭐ {vendor.avg_rating}</span>
									{/if}
								</div>
								{#if vendor.website}
									<a href={vendor.website} target="_blank" rel="noopener" class="vendor-link">
										Visit website ↗
									</a>
								{/if}
							</div>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		{#if results.orgIntelligence.length > 0}
			<section class="results-section">
				<h2>Your Organization's Intel</h2>
				<div class="vendor-grid">
					{#each results.orgIntelligence as vendor (vendor.id)}
						<Card>
							<div class="vendor-card">
								<h3>{vendor.vendor_name}</h3>
								{#if vendor.category}
									<span class="tag">{vendor.category}</span>
								{/if}
								{#if vendor.internal_notes}
									<p class="vendor-desc">{vendor.internal_notes}</p>
								{/if}
							</div>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		{#if results.aiSuggestions.length > 0}
			<section class="results-section">
				<h2>AI Suggestions</h2>
				<p class="section-hint">These vendors were suggested by AI based on your search. Always verify before adding to a project.</p>
				<div class="vendor-grid">
					{#each results.aiSuggestions as vendor, i (i)}
						<Card>
							<div class="vendor-card ai-card">
								<div class="vendor-top">
									<h3>{vendor.name}</h3>
									<span class="ai-badge">AI</span>
								</div>
								<p class="vendor-desc">{vendor.description}</p>
								<div class="vendor-meta">
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
									<a href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener" class="vendor-link">
										{vendor.website} ↗
									</a>
								{/if}
							</div>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		{#if totalResults === 0}
			<Card>
				<div class="empty-results">
					<p>No vendors found matching your search.</p>
					<p class="hint">Try broader terms or a different category.</p>
				</div>
			</Card>
		{/if}
	{/if}
</div>

<style>
	.discover-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header { margin-bottom: var(--space-5); }
	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin: 0; }

	.search-bar {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.search-bar input {
		flex: 1;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}

	.search-bar input:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.search-bar select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		min-width: 140px;
	}

	.results-count {
		font-size: 0.875rem;
		color: var(--neutral-500);
		margin-bottom: var(--space-4);
	}

	.results-section {
		margin-bottom: var(--space-6);
	}

	.results-section h2 {
		font-size: 1rem;
		margin-bottom: var(--space-3);
	}

	.section-hint {
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-bottom: var(--space-3);
	}

	.vendor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.vendor-card { display: flex; flex-direction: column; gap: var(--space-2); }

	.vendor-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.vendor-card h3 {
		font-size: 0.9375rem;
		margin: 0;
	}

	.verified-badge {
		font-size: 0.6875rem;
		color: var(--success-600, #16a34a);
		font-weight: 600;
	}

	.ai-badge {
		font-size: 0.625rem;
		padding: 2px 6px;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		color: white;
		border-radius: 9999px;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.vendor-desc {
		font-size: 0.8125rem;
		color: var(--neutral-600);
		line-height: 1.4;
		margin: 0;
	}

	.vendor-meta {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.tag {
		font-size: 0.6875rem;
		padding: 2px 8px;
		background: var(--neutral-100);
		color: var(--neutral-600);
		border-radius: 9999px;
		text-transform: capitalize;
	}

	.tag.size { background: var(--primary-50); color: var(--primary-700); }

	.rating { font-size: 0.8125rem; }

	.strengths {
		display: flex;
		gap: var(--space-1);
		flex-wrap: wrap;
	}

	.strength-chip {
		font-size: 0.6875rem;
		padding: 2px 8px;
		background: #f0fdf4;
		color: #16a34a;
		border-radius: 9999px;
	}

	.vendor-link {
		font-size: 0.8125rem;
		color: var(--primary-600);
		text-decoration: none;
	}

	.vendor-link:hover { text-decoration: underline; }

	.empty-results {
		text-align: center;
		padding: var(--space-6);
		color: var(--neutral-500);
	}

	.hint { font-size: 0.8125rem; color: var(--neutral-400); }
</style>
