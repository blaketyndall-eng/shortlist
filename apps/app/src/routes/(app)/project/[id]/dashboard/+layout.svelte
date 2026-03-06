<script lang="ts">
	import { page } from '$app/stores';

	let { children, data } = $props();
	const projectId = $derived($page.params.id);

	const tabs = [
		{ id: 'overview', label: 'Overview', icon: '📊', href: `/project/${projectId}/dashboard/overview` },
		{ id: 'vendors', label: 'Vendors', icon: '🏢', href: `/project/${projectId}/dashboard/vendors` },
		{ id: 'calendar', label: 'Calendar', icon: '📅', href: `/project/${projectId}/dashboard/calendar` },
		{ id: 'team', label: 'Team', icon: '👥', href: `/project/${projectId}/dashboard/team` },
		{ id: 'reports', label: 'Reports', icon: '📄', href: `/project/${projectId}/dashboard/reports` },
	];

	const activeTab = $derived(() => {
		const path = $page.url.pathname;
		const match = tabs.find((t) => path.includes(`/dashboard/${t.id}`));
		return match?.id ?? 'overview';
	});
</script>

<div class="dashboard-layout">
	<div class="dash-header">
		<div class="dash-title-row">
			<h1>{data.project?.name ?? 'Project Dashboard'}</h1>
			{#if data.project?.phase}
				<span class="phase-badge" class:evaluate={data.project.phase === 'evaluate'} class:complete={data.project.phase === 'complete'}>
					{data.project.phase === 'define' ? 'Define' : data.project.phase === 'evaluate' ? 'Evaluate' : 'Complete'}
				</span>
			{/if}
		</div>
		<nav class="tab-bar" role="tablist">
			{#each tabs as tab (tab.id)}
				<a
					href={tab.href}
					class="tab-btn"
					class:active={activeTab() === tab.id}
					role="tab"
					aria-selected={activeTab() === tab.id}
				>
					<span class="tab-icon">{tab.icon}</span>
					<span class="tab-label">{tab.label}</span>
				</a>
			{/each}
		</nav>
	</div>

	<div class="dash-body">
		{@render children()}
	</div>
</div>

<style>
	.dashboard-layout {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-height: 100%;
	}

	.dash-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: white;
		border-bottom: 1px solid var(--neutral-200);
		padding: var(--space-4) var(--space-6) 0;
	}

	.dash-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.dash-title-row h1 {
		font-size: 1.375rem;
		font-weight: 700;
		margin: 0;
		color: var(--neutral-900);
	}

	.phase-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.8px;
		padding: 3px 10px;
		border-radius: 999px;
		background: rgba(0, 204, 150, 0.1);
		color: #00cc96;
	}
	.phase-badge.evaluate {
		background: rgba(74, 150, 248, 0.1);
		color: #4a96f8;
	}
	.phase-badge.complete {
		background: rgba(139, 92, 246, 0.1);
		color: #8b5cf6;
	}

	.tab-bar {
		display: flex;
		gap: 0;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-4);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--neutral-500);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab-btn:hover {
		color: var(--neutral-700);
	}

	.tab-btn.active {
		color: var(--primary-600);
		border-bottom-color: var(--primary-600);
		font-weight: 600;
	}

	.tab-icon { font-size: 0.875rem; }

	.dash-body {
		padding: var(--space-6);
		flex: 1;
	}

	@media (max-width: 640px) {
		.dash-header { padding: var(--space-3) var(--space-4) 0; }
		.dash-body { padding: var(--space-4); }
		.tab-btn { padding: var(--space-2) var(--space-3); font-size: 0.8125rem; }
		.tab-label { display: none; }
		.tab-icon { font-size: 1.125rem; }
	}
</style>
