<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import ActivityFeed from '$components/ActivityFeed.svelte';

	let { data } = $props();

	const stepLabels: Record<string, string> = {
		// SOLVE Define phase
		triggers: 'Diagnose',
		category: 'Category',
		vendor_discovery: 'Discovery',
		constraints: 'Constraints',
		priorities: 'Priorities',
		brief: 'Brief',
		challenges: 'Validate',
		// Evaluate phase
		scope: 'Scope',
		discovery: 'Discovery',
		setup: 'Setup',
		criteria: 'Criteria',
		workflow: 'Workflow',
		materials: 'Materials',
		ratings: 'Ratings',
		results: 'Results',
		dashboard: 'Dashboard'
	};

	function getVendorCount(project: any): number {
		const evalVendors = project.state?.vendors?.length ?? 0;
		const solveVendors = project.solve_data?.discoveredVendors?.length ?? 0;
		return evalVendors || solveVendors;
	}

	const scopeStepLabels: Record<string, string> = {
		signal: 'Signal', cause: 'Cause', options: 'Options',
		prepare: 'Prepare', endorse: 'Endorse'
	};

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
</script>

<svelte:head>
	<title>Dashboard — Shortlist</title>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div>
			<h1>Welcome back{data.profile?.full_name ? `, ${data.profile.full_name}` : ''}</h1>
			<p>Here's an overview of your procurement projects.</p>
		</div>
		<a href="/project/new" class="btn-primary">+ New Project</a>
	</header>

	<section class="dashboard-grid">
		<div class="stat-card">
			<span class="stat-label">Active Projects</span>
			<span class="stat-value">{data.stats.activeProjects}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Vendors Tracked</span>
			<span class="stat-value">{data.stats.vendorsTracked}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">AI Credits Used</span>
			<span class="stat-value">{data.stats.aiCreditsUsed}</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Team Members</span>
			<span class="stat-value">{data.stats.teamMembers}</span>
		</div>
	</section>

	{#if data.scopes.length > 0}
		<section class="active-scopes">
			<div class="scope-header">
				<h2>Active SCOPEs</h2>
				<a href="/scope/new" class="scope-new-link">+ New SCOPE</a>
			</div>
			<div class="scope-list">
				{#each data.scopes as scope (scope.id)}
					<a href="/scope/{scope.id}/{scope.current_step}" class="scope-row">
						<div class="scope-info">
							<span class="scope-badge">SCOPE</span>
							<span class="scope-name">{scope.name}</span>
						</div>
						<div class="scope-status">
							<span class="scope-step-badge">{scopeStepLabels[scope.current_step] ?? scope.current_step}</span>
							<span class="project-updated">{timeAgo(scope.updated_at)}</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<section class="recent-projects">
		<h2>Recent Projects</h2>

		{#if data.projects.length > 0}
			<div class="project-list">
				{#each data.projects as project (project.id)}
					{@const solveSteps = ['triggers', 'category', 'vendor_discovery', 'constraints', 'priorities', 'brief', 'challenges']}
					{@const step = project.current_step ?? 'setup'}
					{@const href = solveSteps.includes(step) ? `/project/${project.id}/solve/${step}` : `/project/${project.id}/${step}`}
					<a href={href} class="project-row">
						<div class="project-info">
							<span class="project-name">{project.name}</span>
							<span class="project-meta">
								{#if project.category}
									<span class="project-category">{project.category}</span>
								{/if}
								<span class="project-vendors">
									{getVendorCount(project)} vendors
								</span>
							</span>
						</div>
						<div class="project-status">
							<span class="step-badge">{stepLabels[project.current_step] ?? 'Setup'}</span>
							<span class="project-updated">{timeAgo(project.updated_at)}</span>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<p>No projects yet. Create your first procurement project to get started.</p>
				<a href="/project/new" class="btn-primary">New Project</a>
			</div>
		{/if}
	</section>

	<section class="activity-section">
		<Card>
			<h2>Recent Activity</h2>
			<ActivityFeed activities={data.activities} maxItems={10} />
		</Card>
	</section>
</div>

<style>
	.dashboard {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-6);
	}

	.dashboard-header h1 {
		margin-bottom: var(--space-1);
	}

	.dashboard-header p {
		color: var(--neutral-500);
		margin-bottom: 0;
	}

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
		cursor: pointer;
		transition: background var(--transition-fast);
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: var(--primary-700);
		text-decoration: none;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	.stat-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--neutral-500);
		font-weight: 500;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--neutral-900);
	}

	.recent-projects {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
	}

	.recent-projects h2 {
		margin-bottom: var(--space-4);
	}

	.project-list {
		display: flex;
		flex-direction: column;
	}

	.project-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-2);
		border-bottom: 1px solid var(--neutral-100);
		text-decoration: none;
		color: inherit;
		transition: background var(--transition-fast);
		border-radius: var(--radius-md);
	}

	.project-row:hover {
		background: var(--neutral-50);
		text-decoration: none;
	}

	.project-row:last-child {
		border-bottom: none;
	}

	.project-name {
		font-weight: 600;
		color: var(--neutral-800);
		display: block;
	}

	.project-meta {
		display: flex;
		gap: var(--space-2);
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-top: 2px;
	}

	.project-category {
		text-transform: capitalize;
	}

	.project-status {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.step-badge {
		display: inline-block;
		padding: 2px var(--space-2);
		background: var(--primary-50);
		color: var(--primary-700);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.project-updated {
		font-size: 0.75rem;
		color: var(--neutral-400);
		min-width: 50px;
		text-align: right;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-8) var(--space-4);
		color: var(--neutral-500);
	}

	.empty-state p {
		margin-bottom: var(--space-4);
	}

	.active-scopes {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		margin-bottom: var(--space-4);
	}

	.scope-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.scope-header h2 {
		margin-bottom: 0;
	}

	.scope-new-link {
		font-size: 0.8125rem;
		color: var(--primary-600);
		text-decoration: none;
		font-weight: 500;
	}

	.scope-new-link:hover {
		text-decoration: underline;
	}

	.scope-list {
		display: flex;
		flex-direction: column;
	}

	.scope-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-2);
		border-bottom: 1px solid var(--neutral-100);
		text-decoration: none;
		color: inherit;
		transition: background var(--transition-fast);
		border-radius: var(--radius-md);
	}

	.scope-row:hover {
		background: var(--neutral-50);
		text-decoration: none;
	}

	.scope-row:last-child {
		border-bottom: none;
	}

	.scope-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.scope-badge {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--primary-50, rgba(0, 204, 150, 0.08));
		color: var(--primary-700, #00cc96);
	}

	.scope-name {
		font-weight: 600;
		color: var(--neutral-800);
	}

	.scope-status {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-shrink: 0;
	}

	.scope-step-badge {
		display: inline-block;
		padding: 2px var(--space-2);
		background: rgba(245, 158, 11, 0.08);
		color: #d97706;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.activity-section {
		margin-top: var(--space-6);
	}

	.activity-section h2 {
		margin-bottom: var(--space-3);
	}
</style>
