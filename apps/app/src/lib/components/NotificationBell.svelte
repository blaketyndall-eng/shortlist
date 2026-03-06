<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { onMount } from 'svelte';

	let { userId }: { userId: string } = $props();

	const supabase = createSupabaseBrowserClient();

	let notifications = $state<any[]>([]);
	let unreadCount = $state(0);
	let showDropdown = $state(false);
	let loading = $state(false);

	async function loadNotifications() {
		loading = true;
		const { data } = await supabase
			.from('notifications')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(10);

		notifications = data ?? [];
		unreadCount = notifications.filter((n) => !n.read).length;
		loading = false;
	}

	async function markRead(id: string) {
		await supabase.from('notifications').update({ read: true }).eq('id', id);
		notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
		unreadCount = notifications.filter((n) => !n.read).length;
	}

	async function markAllRead() {
		const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
		if (unreadIds.length === 0) return;

		await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
		notifications = notifications.map((n) => ({ ...n, read: true }));
		unreadCount = 0;
	}

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h`;
		const days = Math.floor(hrs / 24);
		return `${days}d`;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.notif-container')) {
			showDropdown = false;
		}
	}

	onMount(() => {
		loadNotifications();

		// Subscribe to new notifications in realtime
		const channel = supabase
			.channel('user-notifications')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${userId}`
				},
				(payload) => {
					notifications = [payload.new as any, ...notifications].slice(0, 10);
					unreadCount += 1;
				}
			)
			.subscribe();

		document.addEventListener('click', handleClickOutside);

		return () => {
			supabase.removeChannel(channel);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="notif-container">
	<button class="bell-btn" onclick={() => { showDropdown = !showDropdown; if (!showDropdown) return; loadNotifications(); }}>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
			<path d="M13.73 21a2 2 0 0 1-3.46 0" />
		</svg>
		{#if unreadCount > 0}
			<span class="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
		{/if}
	</button>

	{#if showDropdown}
		<div class="dropdown">
			<div class="dropdown-header">
				<span class="dropdown-title">Notifications</span>
				{#if unreadCount > 0}
					<button class="mark-all" onclick={markAllRead}>Mark all read</button>
				{/if}
			</div>

			{#if notifications.length === 0}
				<div class="empty">No notifications yet.</div>
			{:else}
				<ul class="notif-list">
					{#each notifications as notif (notif.id)}
						<li class="notif-item" class:unread={!notif.read}>
							<button class="notif-btn" onclick={() => markRead(notif.id)}>
								<div class="notif-content">
									<span class="notif-title">{notif.title}</span>
									<span class="notif-body">{notif.body}</span>
								</div>
								<span class="notif-time">{timeAgo(notif.created_at)}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.notif-container { position: relative; }

	.bell-btn {
		position: relative;
		background: none;
		border: none;
		color: var(--neutral-500);
		cursor: pointer;
		padding: 6px;
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.bell-btn:hover { color: var(--neutral-700); background: var(--neutral-100); }

	.badge {
		position: absolute;
		top: 0;
		right: 0;
		min-width: 16px;
		height: 16px;
		background: var(--danger-500, #ef4444);
		color: white;
		font-size: 0.625rem;
		font-weight: 700;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
		line-height: 1;
	}

	.dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		width: 340px;
		background: white;
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		z-index: var(--z-dropdown, 100);
		overflow: hidden;
	}

	.dropdown-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--neutral-100);
	}

	.dropdown-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--neutral-800);
	}

	.mark-all {
		background: none;
		border: none;
		font-size: 0.75rem;
		color: var(--primary-600);
		cursor: pointer;
		font-weight: 500;
	}

	.mark-all:hover { text-decoration: underline; }

	.notif-list {
		list-style: none;
		padding: 0;
		margin: 0;
		max-height: 360px;
		overflow-y: auto;
	}

	.notif-item { border-bottom: 1px solid var(--neutral-50); }
	.notif-item:last-child { border-bottom: none; }

	.notif-item.unread { background: var(--primary-50); }

	.notif-btn {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		gap: var(--space-2);
	}

	.notif-btn:hover { background: var(--neutral-50); }

	.notif-content { flex: 1; min-width: 0; }

	.notif-title {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--neutral-800);
	}

	.notif-body {
		display: block;
		font-size: 0.75rem;
		color: var(--neutral-500);
		margin-top: 2px;
		line-height: 1.3;
	}

	.notif-time {
		font-size: 0.6875rem;
		color: var(--neutral-400);
		flex-shrink: 0;
	}

	.empty {
		padding: var(--space-6);
		text-align: center;
		font-size: 0.8125rem;
		color: var(--neutral-400);
	}
</style>
