<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let searchQuery = $state(data.filters.search ?? '');
	let statusFilter = $state(data.filters.status ?? 'all');
	let categoryFilter = $state(data.filters.category ?? '');

	const categories = ['software', 'services', 'hardware', 'infrastructure', 'marketing', 'other'];
	const statuses = ['all', 'active', 'completed', 'archived'];

	const stepLabels: Record<string, string> = {
		discovery: 'Discovery', setup: 'Setup', criteria: 'Criteria',
		workflow: 'Workflow', materials: 'Materials', ratings: 'Ratings', results: 'Results'
	};

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (categoryFilter) params.set('category', categoryFilter);
		const qs = params.toString();
		goto(`/projects${qs ? '?' + qs : ''}`, { invalidateAll: true });
	}

	function clearFilters() {
		searchQuery = '';
		statusFilter = 'all';
		categoryFilter = '';
		goto('/projects', { invalidateAll: true });
	}

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		return new Date(dateStr).toLocaleDateString();
	}

	const hasFilters = $derived(searchQuery || statusFilter !== 'all' || categoryFilter);
</script>

<svelte:head>
	<title>Projects — Shortlist</title>
</svelte:head>

<div class="projects-page">
	<header class="page-header">
		<div>
			<h1>Projects</h1>
			<p>{data.projects.length} project{data.projects.length !== 1 ? 's' : ''}</p>
		</div>
		<a href="/project/new" class="btn-primary">+ New Project</a>
	</header>

	<div class="filters">
		<div class="search-box">
			<input
				type="text"
				placeholder="Search projects..."
				bind:value={searchQuery}
				onkeydown={(e) => { if (e.key === 'Enter') applyFilters(); }}
			/>
		</div>
		<select bind:value={statusFilter} onchange={applyFilters}>
			{#each statuses as s}
				<option value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
			{/each}
		</select>
		<select bind:value={categoryFilter} onchange={applyFilters}>
			<option value="">All Categories</option>
			{#each categories as cat}
				<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
			{/each}
		</select>
		{#if hasFilters}
			<button class="clear-btn" onclick={clearFilters}>Clear</button>
		{/if}
	</div>

	{#if data.projects.length === 0}
		<Card>
			<div class="empty-state">
				<p>{hasFilters ? 'No projects match your filters.' : 'No projects yet.'}</p>
				{#if hasFilters}
					<Button variant="secondary" onclick={clearFilters}>Clear Filters</Button>
				{:else}
					<a href="/project/new" class="btn-primary">Create Your First Project</a>
				{/if}
			</div>
		</Card>
	{:else}
		<div class="project-grid">
			{#each data.projects as project (project.id)}
				<a href="/project/{project.id}/{project.current_step ?? 'setup'}" class="project-card">
					<div class="card-top">
						<span class="card-category">{project.category ?? 'General'}</span>
						<span class="card-step">{stepLabels[project.current_step] ?? 'Setup'}</span>
					</div>
					<h3>{project.name}</h3>
					<div class="card-meta">
						<span>{project.state?.vendors?.length ?? 0} vendors</span>
						<span>{project.state?.criteria?.length ?? 0} criteria</span>
					</div>
					<div class="card-footer">
						<span class="card-status" class:active={project.status === 'active'} class:completed={project.status === 'completed'}>
							{project.status}
						</span>
						<span class="card-time">{timeAgo(project.updated_at)}</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.projects-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-5);
	}

	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin: 0; font-size: 0.875rem; }

	.btn-primary {
		display: inline-block;
		padding: var(--space-2) var(--space-5);
		background: var(--primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}

	.btn-primary:hover { background: var(--primary-700); text-decoration: none; }

	.filters {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-5);
		flex-wrap: wrap;
	}

	.search-box { flex: 1; min-width: 200px; }

	.search-box input,
	.filters select {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
	}

	.filters select { width: auto; min-width: 140px; }

	.search-box input:focus,
	.filters select:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.clear-btn {
		padding: var(--space-2) var(--space-3);
		background: none;
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--neutral-500);
		cursor: pointer;
	}

	.clear-btn:hover { background: var(--neutral-50); }

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.project-card {
		background: white;
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-fast);
	}

	.project-card:hover {
		border-color: var(--primary-300);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		text-decoration: none;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.card-category {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--neutral-400);
		font-weight: 600;
	}

	.card-step {
		font-size: 0.6875rem;
		padding: 2px 8px;
		background: var(--primary-50);
		color: var(--primary-700);
		border-radius: 9999px;
		font-weight: 500;
	}

	h3 {
		font-size: 1rem;
		margin-bottom: var(--space-2);
		color: var(--neutral-800);
	}

	.card-meta {
		display: flex;
		gap: var(--space-3);
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-bottom: var(--space-3);
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-3);
		border-top: 1px solid var(--neutral-100);
	}

	.card-status {
		font-size: 0.6875rem;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.03em;
		color: var(--neutral-400);
	}

	.card-status.active { color: var(--success-600, #16a34a); }
	.card-status.completed { color: var(--primary-600); }

	.card-time {
		font-size: 0.75rem;
		color: var(--neutral-400);
	}

	.empty-state {
		text-align: center;
		padding: var(--space-8);
		color: var(--neutral-500);
	}

	.empty-state p { margin-bottom: var(--space-4); }
</style>
