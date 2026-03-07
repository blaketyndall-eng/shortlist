<script lang="ts">
	import type { ExecutiveDashboardData, ExecutiveBriefing } from '@shortlist/shared-types/executive';
	import MetricCard from '$lib/components/executive/MetricCard.svelte';
	import ProjectHealthCard from '$lib/components/executive/ProjectHealthCard.svelte';
	import BriefingCard from '$lib/components/executive/BriefingCard.svelte';
	import ExecutiveNotificationBanner from '$lib/components/executive/ExecutiveNotificationBanner.svelte';

	let dashboard = $state<ExecutiveDashboardData | null>(null);
	let loading = $state(true);
	let error = $state('');
	let generating = $state(false);
	let bannerMessage = $state('');

	async function loadDashboard() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/executive/dashboard');
			if (!res.ok) {
				if (res.status === 403) {
					error = 'You do not have permission to view the executive dashboard.';
					return;
				}
				throw new Error('Failed to load dashboard');
			}
			const json = await res.json();
			dashboard = json.dashboard;

			// Check for new draft briefings
			const drafts = dashboard?.recentBriefings?.filter(b => b.status === 'draft') ?? [];
			if (drafts.length > 0) {
				bannerMessage = `${drafts.length} new briefing${drafts.length > 1 ? 's' : ''} awaiting review`;
			}
		} catch (e: any) {
			error = e.message ?? 'Failed to load executive dashboard';
		} finally {
			loading = false;
		}
	}

	async function generateBriefing(projectId: string) {
		generating = true;
		try {
			const res = await fetch('/api/executive/briefings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId, briefingType: 'milestone' }),
			});
			if (res.ok) {
				await loadDashboard();
			}
		} finally {
			generating = false;
		}
	}

	$effect(() => {
		loadDashboard();
	});
</script>

<div class="executive-page">
	<div class="page-header">
		<div>
			<h1>Executive Dashboard</h1>
			<p class="subtitle">Intelligence overview across all projects</p>
		</div>
	</div>

	{#if bannerMessage}
		<ExecutiveNotificationBanner
			message={bannerMessage}
			type="info"
			href="#briefings"
			onDismiss={() => bannerMessage = ''}
		/>
	{/if}

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading executive intelligence...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>{error}</p>
		</div>
	{:else if dashboard}
		<!-- Metric cards row -->
		<div class="metrics-row">
			<MetricCard
				label="Active Projects"
				value={dashboard.activeProjects}
				icon="projects"
				color="var(--color-primary)"
			/>
			<MetricCard
				label="Overall Alignment"
				value={dashboard.overallAlignmentScore}
				icon="alignment"
				color={dashboard.overallAlignmentScore >= 70 ? 'var(--color-primary)' : dashboard.overallAlignmentScore >= 50 ? '#f59e0b' : '#ef4444'}
			/>
			<MetricCard
				label="Vendors in Pipeline"
				value={dashboard.vendorsInPipeline}
				icon="vendors"
				color="var(--color-accent, #4a96f8)"
			/>
			<MetricCard
				label="Risk Alerts"
				value={dashboard.riskAlerts}
				icon="risk"
				color={dashboard.riskAlerts > 0 ? '#ef4444' : 'var(--color-primary)'}
			/>
			<MetricCard
				label="Team Participation"
				value="{dashboard.teamParticipationRate}%"
				icon="participation"
				color="var(--color-primary)"
			/>
		</div>

		<!-- Project health grid -->
		<section class="section">
			<div class="section-header">
				<h2>Project Health</h2>
			</div>
			{#if dashboard.projects.length === 0}
				<div class="empty-state">
					<p>No active projects yet.</p>
				</div>
			{:else}
				<div class="project-grid">
					{#each dashboard.projects as project}
						<ProjectHealthCard {project} />
					{/each}
				</div>
			{/if}
		</section>

		<!-- Recent briefings -->
		<section class="section" id="briefings">
			<div class="section-header">
				<h2>Recent Briefings</h2>
			</div>
			{#if dashboard.recentBriefings.length === 0}
				<div class="empty-state">
					<p>No briefings generated yet. Briefings are automatically created at project milestones.</p>
				</div>
			{:else}
				<div class="briefings-grid">
					{#each dashboard.recentBriefings as briefing}
						<BriefingCard {briefing} />
					{/each}
				</div>
			{/if}
		</section>

		<!-- Generate briefing for any project -->
		{#if dashboard.projects.length > 0}
			<section class="section">
				<div class="section-header">
					<h2>Generate Briefing</h2>
				</div>
				<div class="generate-actions">
					{#each dashboard.projects as project}
						<button
							class="generate-btn"
							disabled={generating}
							onclick={() => generateBriefing(project.id)}
						>
							{generating ? 'Generating...' : `Generate for ${project.name}`}
						</button>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.executive-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 32px 24px;
	}

	.page-header {
		margin-bottom: 24px;
	}

	.page-header h1 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-heading);
		margin: 0;
	}

	.subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 4px 0 0;
	}

	.loading-state, .error-state {
		text-align: center;
		padding: 60px 20px;
		color: var(--color-text-secondary);
	}

	.error-state {
		color: #ef4444;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 auto 12px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.metrics-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
		margin-bottom: 32px;
	}

	.section {
		margin-bottom: 32px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.section-header h2 {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-heading);
		margin: 0;
	}

	.project-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
	}

	.briefings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 12px;
	}

	.empty-state {
		padding: 40px 20px;
		text-align: center;
		color: var(--color-text-secondary);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-xl);
	}

	.generate-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.generate-btn {
		padding: 8px 16px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: border-color var(--transition-fast);
	}

	.generate-btn:hover:not(:disabled) {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.generate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
