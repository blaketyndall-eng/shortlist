<script lang="ts">
	import type { ExecutiveBriefing } from '@shortlist/shared-types/executive';
	import { BRIEFING_TYPE_CONFIG } from '@shortlist/shared-types/executive';

	interface Props {
		briefing: ExecutiveBriefing;
	}

	let { briefing }: Props = $props();

	const typeConfig = $derived(BRIEFING_TYPE_CONFIG[briefing.briefing_type] ?? { label: briefing.briefing_type, color: '#888' });

	const formatDate = (d: string) => {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const statusColors: Record<string, string> = {
		draft: '#f59e0b',
		published: 'var(--color-primary)',
		archived: 'var(--color-text-secondary)',
	};
</script>

<a href="/executive/briefings/{briefing.id}" class="briefing-card">
	<div class="card-top">
		<span class="type-badge" style="background: {typeConfig.color}20; color: {typeConfig.color}">
			{typeConfig.label}
		</span>
		<span class="status-dot" style="background: {statusColors[briefing.status] ?? '#888'}"></span>
	</div>

	<h3 class="briefing-title">{briefing.title}</h3>
	<p class="briefing-summary">{briefing.summary}</p>

	<div class="card-footer">
		<span class="date">{formatDate(briefing.created_at)}</span>
		<span class="read-link">Read &rarr;</span>
	</div>
</a>

<style>
	.briefing-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 16px;
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition: border-color var(--transition-fast);
	}

	.briefing-card:hover {
		border-color: var(--color-primary);
		text-decoration: none;
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.type-badge {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		border-radius: var(--radius-full);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.briefing-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-heading);
		margin: 0;
		line-height: 1.3;
	}

	.briefing-summary {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 4px;
	}

	.date {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
	}

	.read-link {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-primary);
	}
</style>
