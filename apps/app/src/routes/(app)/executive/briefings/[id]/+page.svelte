<script lang="ts">
	import type { ExecutiveBriefing, BriefingSection } from '@shortlist/shared-types/executive';
	import { BRIEFING_TYPE_CONFIG } from '@shortlist/shared-types/executive';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let briefing = $state<ExecutiveBriefing | null>(null);
	let loading = $state(true);
	let error = $state('');
	let approving = $state(false);
	let publishing = $state(false);

	const typeConfig = $derived(
		briefing ? (BRIEFING_TYPE_CONFIG[briefing.briefing_type] ?? { label: briefing.briefing_type, color: '#888' }) : null
	);

	const sections = $derived<BriefingSection[]>(
		(briefing?.body as any)?.sections ?? []
	);

	const recommendedActions = $derived<string[]>(
		(briefing?.body as any)?.recommendedActions ?? []
	);

	const metrics = $derived(briefing?.key_metrics as Record<string, any> ?? {});

	const formatDate = (d: string) => {
		return new Date(d).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	};

	async function loadBriefing() {
		loading = true;
		try {
			const res = await fetch(`/api/executive/briefings/${data.briefingId}`);
			if (!res.ok) throw new Error('Failed to load briefing');
			const json = await res.json();
			briefing = json.briefing;
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function publishBriefing() {
		if (!briefing) return;
		publishing = true;
		try {
			const res = await fetch(`/api/executive/briefings/${briefing.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'published' }),
			});
			if (res.ok) {
				briefing = { ...briefing, status: 'published' };
			}
		} finally {
			publishing = false;
		}
	}

	async function approveBriefing() {
		if (!briefing) return;
		approving = true;
		try {
			const res = await fetch(`/api/executive/briefings/${briefing.id}/approve`, {
				method: 'POST',
			});
			if (res.ok) {
				briefing = { ...briefing, status: 'published' };
			}
		} finally {
			approving = false;
		}
	}

	$effect(() => {
		loadBriefing();
	});
</script>

<div class="briefing-page">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading briefing...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>{error}</p>
			<a href="/executive" class="back-link">&larr; Back to Dashboard</a>
		</div>
	{:else if briefing}
		<div class="breadcrumb">
			<a href="/executive">&larr; Executive Dashboard</a>
		</div>

		<header class="briefing-header">
			<div class="header-meta">
				{#if typeConfig}
					<span class="type-badge" style="background: {typeConfig.color}20; color: {typeConfig.color}">
						{typeConfig.label}
					</span>
				{/if}
				<span class="status-badge" class:draft={briefing.status === 'draft'} class:published={briefing.status === 'published'}>
					{briefing.status}
				</span>
				<span class="date">{formatDate(briefing.created_at)}</span>
			</div>
			<h1>{briefing.title}</h1>
			<p class="summary">{briefing.summary}</p>
		</header>

		<div class="briefing-layout">
			<!-- Main content -->
			<div class="briefing-body">
				{#each sections as section}
					<section class="content-section">
						<h2>{section.heading}</h2>
						<div class="section-content">{section.content}</div>
					</section>
				{/each}

				{#if recommendedActions.length > 0}
					<section class="content-section actions-section">
						<h2>Recommended Actions</h2>
						<ul class="actions-list">
							{#each recommendedActions as action}
								<li>{action}</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>

			<!-- Sidebar metrics -->
			<aside class="briefing-sidebar">
				<h3>Key Metrics</h3>
				<div class="metric-list">
					{#if metrics.vendorsEvaluated !== undefined}
						<div class="sidebar-metric">
							<span class="metric-label">Vendors Evaluated</span>
							<span class="metric-value">{metrics.vendorsEvaluated}</span>
						</div>
					{/if}
					{#if metrics.alignmentScore !== undefined}
						<div class="sidebar-metric">
							<span class="metric-label">Alignment Score</span>
							<span class="metric-value">{metrics.alignmentScore}/100</span>
						</div>
					{/if}
					{#if metrics.budgetUtilization !== undefined}
						<div class="sidebar-metric">
							<span class="metric-label">Budget Utilization</span>
							<span class="metric-value">{metrics.budgetUtilization}%</span>
						</div>
					{/if}
					{#if metrics.riskLevel}
						<div class="sidebar-metric">
							<span class="metric-label">Risk Level</span>
							<span class="metric-value risk-{metrics.riskLevel}">{metrics.riskLevel}</span>
						</div>
					{/if}
					{#if metrics.activePolls !== undefined}
						<div class="sidebar-metric">
							<span class="metric-label">Active Polls</span>
							<span class="metric-value">{metrics.activePolls}</span>
						</div>
					{/if}
					{#if metrics.teamParticipation !== undefined}
						<div class="sidebar-metric">
							<span class="metric-label">Team Participation</span>
							<span class="metric-value">{metrics.teamParticipation}%</span>
						</div>
					{/if}
				</div>

				{#if briefing.status === 'draft'}
					<div class="sidebar-actions">
						<button class="btn-publish" onclick={publishBriefing} disabled={publishing}>
							{publishing ? 'Publishing...' : 'Publish Briefing'}
						</button>
						<button class="btn-approve" onclick={approveBriefing} disabled={approving}>
							{approving ? 'Approving...' : 'Approve & Publish'}
						</button>
					</div>
				{/if}

				{#if briefing.ai_model}
					<div class="ai-info">
						Generated by AI ({briefing.ai_model})
					</div>
				{/if}
			</aside>
		</div>
	{/if}
</div>

<style>
	.briefing-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 32px 24px;
	}

	.loading-state, .error-state {
		text-align: center;
		padding: 60px 20px;
		color: var(--color-text-secondary);
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

	.breadcrumb {
		margin-bottom: 20px;
	}

	.breadcrumb a {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		text-decoration: none;
	}

	.breadcrumb a:hover {
		color: var(--color-primary);
	}

	.briefing-header {
		margin-bottom: 32px;
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}

	.type-badge {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.status-badge {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		background: rgba(255,255,255,0.1);
		color: var(--color-text-secondary);
	}

	.status-badge.draft {
		background: #f59e0b20;
		color: #f59e0b;
	}

	.status-badge.published {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}

	.date {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.briefing-header h1 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-heading);
		margin: 0 0 8px;
	}

	.summary {
		font-size: 1rem;
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.briefing-layout {
		display: grid;
		grid-template-columns: 1fr 260px;
		gap: 32px;
	}

	.briefing-body {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.content-section h2 {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-heading);
		margin: 0 0 8px;
	}

	.section-content {
		font-size: 0.875rem;
		color: var(--color-text);
		line-height: 1.7;
	}

	.actions-section {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 20px;
	}

	.actions-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.actions-list li {
		font-size: 0.8125rem;
		color: var(--color-text);
		padding: 8px 12px;
		background: rgba(255,255,255,0.03);
		border-radius: var(--radius-lg);
		border-left: 3px solid var(--color-primary);
	}

	.briefing-sidebar {
		position: sticky;
		top: 32px;
		align-self: start;
	}

	.briefing-sidebar h3 {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-text-heading);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0 0 12px;
	}

	.metric-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.sidebar-metric {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.metric-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.metric-value {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-text-heading);
	}

	.metric-value.risk-high {
		color: #ef4444;
	}

	.metric-value.risk-medium {
		color: #f59e0b;
	}

	.metric-value.risk-low {
		color: var(--color-primary);
	}

	.sidebar-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}

	.btn-publish, .btn-approve {
		width: 100%;
		padding: 10px 16px;
		border-radius: var(--radius-lg);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--transition-fast);
		border: none;
	}

	.btn-publish {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		color: var(--color-text);
	}

	.btn-approve {
		background: var(--color-primary);
		color: #fff;
	}

	.btn-publish:hover:not(:disabled),
	.btn-approve:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-publish:disabled,
	.btn-approve:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ai-info {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
		text-align: center;
		opacity: 0.6;
	}

	.back-link {
		color: var(--color-primary);
		text-decoration: none;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.briefing-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
