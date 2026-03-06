<script lang="ts">
	interface Activity {
		id: string;
		type: string;
		description: string;
		user_name?: string;
		created_at: string;
		metadata?: Record<string, unknown>;
	}

	let { activities = [], maxItems = 10 }: { activities: Activity[]; maxItems?: number } = $props();

	const icons: Record<string, string> = {
		project_created: '🆕',
		vendor_added: '🏢',
		score_submitted: '⭐',
		ai_analysis: '🤖',
		comment_added: '💬',
		poll_created: '📊',
		member_invited: '👥',
		step_completed: '✅',
		project_completed: '🏆',
		default: '📌'
	};

	function getIcon(type: string) {
		return icons[type] ?? icons.default;
	}

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(dateStr).toLocaleDateString();
	}

	const displayed = $derived(activities.slice(0, maxItems));
</script>

<div class="feed">
	{#if displayed.length === 0}
		<p class="empty">No activity yet.</p>
	{:else}
		<ul class="feed-list">
			{#each displayed as item (item.id)}
				<li class="feed-item">
					<span class="feed-icon">{getIcon(item.type)}</span>
					<div class="feed-content">
						<p class="feed-desc">
							{#if item.user_name}
								<strong>{item.user_name}</strong>
							{/if}
							{item.description}
						</p>
						<span class="feed-time">{timeAgo(item.created_at)}</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.feed { width: 100%; }

	.empty {
		text-align: center;
		color: var(--neutral-400);
		font-size: 0.875rem;
		padding: var(--space-4) 0;
	}

	.feed-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.feed-item {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--neutral-50);
	}

	.feed-item:last-child { border-bottom: none; }

	.feed-icon {
		font-size: 1rem;
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--neutral-50);
		border-radius: var(--radius-md);
	}

	.feed-content { flex: 1; min-width: 0; }

	.feed-desc {
		font-size: 0.8125rem;
		color: var(--neutral-700);
		margin: 0;
		line-height: 1.4;
	}

	.feed-desc strong {
		color: var(--neutral-900);
	}

	.feed-time {
		font-size: 0.6875rem;
		color: var(--neutral-400);
		margin-top: 2px;
		display: block;
	}
</style>
