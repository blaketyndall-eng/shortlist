<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import ActivityFeed from '$components/ActivityFeed.svelte';
	import OnboardingChecklist from '$components/OnboardingChecklist.svelte';
	import ProductTour from '$components/ProductTour.svelte';

	let { data } = $props();

	// Show product tour for users who haven't completed onboarding yet
	let showTour = $state(!data.profile?.onboarding_completed);
	let checklistDismissed = $state(false);

	// Show checklist when not all onboarding tasks are done
	const showChecklist = $derived(
		!checklistDismissed &&
		data.onboarding &&
		(!data.onboarding.hasCompanyProfile || !data.onboarding.hasTeamInvites || !data.onboarding.hasProject)
	);

	const scopeStepLabels: Record<string, string> = {
		signal: 'Signal',
		cause: 'Cause',
		options: 'Options',
		prepare: 'Prepare',
		endorse: 'Endorse',
	};

	const stepLabels: Record<string, string> = {
		discovery: 'Discovery',
		setup: 'Setup',
		criteria: 'Criteria',
		workflow: 'Workflow',
		materials: 'Materials',
		ratings: 'Ratings',
		results: 'Results'
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
			<p>Here's an overview of your purchase intelligence projects.</p>
		</div>
		<a href="/project/new" class="btn-primary">+ New</a>
	</header>

	{#if showChecklist && data.profile?.id}
		<section class="onboarding-section">
			<OnboardingChecklist
				hasCompanyProfile={data.onboarding.hasCompanyProfile}
				hasTeamInvites={data.onboarding.hasTeamInvites}
				hasProject={data.onboarding.hasProject}
				profileId={data.profile.id}
				ondismiss={() => checklistDismissed = true}
			/>
		</section>
	{/if}

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

	{#if data.scopes && data.scopes.length > 0}
		<section class="active-scopes">
			<h2>Active SCOPEs</h2>
			<div class="scope-list">
				{#each data.scopes as scope (scope.id)}
					<a href="/scope/{scope.id}/{scope.current_step ?? 'signal'}" class="scope-row">
						<div class="scope-info">
							<span class="scope-name">{scope.name}</span>
							<span class="scope-meta">{timeAgo(scope.updated_at)}</span>
						</div>
						<span class="step-badge scope-badge">{scopeStepLabels[scope.current_step] ?? 'Signal'}</span>
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
					<a href="/project/{project.id}/{project.current_step ?? 'setup'}" class="project-row">
						<div class="project-info">
							<span class="project-name">{project.name}</span>
							<span class="project-meta">
								{#if project.category}
									<span class="project-category">{project.category}</span>
								{/if}
								<span class="project-vendors">
									{project.state?.vendors?.length ?? 0} vendors
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
			<div class="getting-started">
				<div class="gs-header">
					<h3>Get started with Shortlist</h3>
					<p>Follow these steps to run your first vendor evaluation.</p>
				</div>
				<div class="gs-steps">
					<a href="/project/new" class="gs-step">
						<span class="gs-number">1</span>
						<div class="gs-info">
							<span class="gs-title">Create a project</span>
							<span class="gs-desc">Define what you're evaluating (e.g., "CRM Platform Selection")</span>
						</div>
						<span class="gs-arrow">→</span>
					</a>
					<div class="gs-step gs-disabled">
						<span class="gs-number">2</span>
						<div class="gs-info">
							<span class="gs-title">Add vendors to compare</span>
							<span class="gs-desc">Search our library or add vendors manually</span>
						</div>
					</div>
					<div class="gs-step gs-disabled">
						<span class="gs-number">3</span>
						<div class="gs-info">
							<span class="gs-title">Score and evaluate</span>
							<span class="gs-desc">Rate vendors against your criteria with AI assistance</span>
						</div>
					</div>
					<div class="gs-step gs-disabled">
						<span class="gs-number">4</span>
						<div class="gs-info">
							<span class="gs-title">Get your recommendation</span>
							<span class="gs-desc">See weighted rankings and export a decision report</span>
						</div>
					</div>
				</div>
				<div class="gs-explore">
					<a href="/discover" class="explore-link">Or explore our vendor library first →</a>
				</div>
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

{#if showTour && data.profile?.id}
	<ProductTour bind:open={showTour} profileId={data.profile.id} />
{/if}

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

	.onboarding-section {
		margin-bottom: var(--space-6);
	}

	.activity-section {
		margin-top: var(--space-6);
	}

	.activity-section h2 {
		margin-bottom: var(--space-3);
	}

	.getting-started { padding: var(--space-4) 0; }
	.gs-header { text-align: center; margin-bottom: var(--space-5); }
	.gs-header h3 { font-size: 1.125rem; margin-bottom: var(--space-1); }
	.gs-header p { color: var(--neutral-400); font-size: 0.875rem; }
	.gs-steps { display: flex; flex-direction: column; gap: var(--space-2); }
	.gs-step {
		display: flex; align-items: center; gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
		text-decoration: none; color: inherit; transition: all var(--transition-fast);
	}
	a.gs-step:hover { border-color: var(--primary-500); background: rgba(74, 150, 248, 0.05); text-decoration: none; }
	.gs-disabled { opacity: 0.5; }
	.gs-number {
		width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.8125rem; font-weight: 700;
		background: var(--primary-50); color: var(--primary-700);
	}
	a.gs-step .gs-number { background: var(--primary-600); color: white; }
	.gs-info { flex: 1; }
	.gs-title { display: block; font-weight: 500; font-size: 0.9375rem; }
	.gs-desc { display: block; font-size: 0.8125rem; color: var(--neutral-400); margin-top: 2px; }
	.gs-arrow { color: var(--primary-600); font-size: 1.25rem; flex-shrink: 0; }
	.gs-explore { text-align: center; margin-top: var(--space-4); }
	.explore-link { color: var(--primary-600); text-decoration: none; font-size: 0.875rem; }
	.explore-link:hover { text-decoration: underline; }

	.active-scopes {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		margin-bottom: var(--space-4);
	}

	.active-scopes h2 {
		margin-bottom: var(--space-4);
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
		flex-direction: column;
		gap: 2px;
	}

	.scope-name {
		font-weight: 600;
		color: var(--neutral-800);
	}

	.scope-meta {
		font-size: 0.75rem;
		color: var(--neutral-400);
	}

	.scope-badge {
		background: rgba(245, 158, 11, 0.1);
		color: rgb(180, 115, 10);
	}
</style>
