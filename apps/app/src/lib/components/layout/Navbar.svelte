<script lang="ts">
	import type { UserProfile } from '@shortlist/shared-types/auth';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import NotificationBell from '$components/NotificationBell.svelte';

	interface Props {
		profile: UserProfile | null;
		onToggleSidebar: () => void;
	}

	let { profile, onToggleSidebar }: Props = $props();

	const supabase = createSupabaseBrowserClient();

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/auth/login');
	}
</script>

<header class="navbar">
	<div class="navbar-left">
		<button class="sidebar-toggle" onclick={onToggleSidebar} aria-label="Toggle sidebar">
			☰
		</button>
	</div>

	<div class="navbar-right">
		{#if profile}
			<NotificationBell userId={profile.id} />
		{/if}
		<button class="logout-btn" onclick={handleLogout}>
			Log out
		</button>
	</div>
</header>

<style>
	.navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-4);
		height: var(--nav-height);
		background: rgba(11, 16, 23, 0.9);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--b);
		flex-shrink: 0;
	}

	.navbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.sidebar-toggle {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.25rem;
		color: var(--mu);
		padding: var(--space-1);
		border-radius: 6px;
		transition: color 150ms ease;
	}

	.sidebar-toggle:hover {
		color: var(--tx);
	}

	.navbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.logout-btn {
		background: none;
		border: 1px solid var(--b2);
		padding: var(--space-1) var(--space-3);
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--mu);
		cursor: pointer;
		transition: all 150ms ease;
		font-family: var(--font-sans);
	}

	.logout-btn:hover {
		border-color: var(--t);
		color: var(--t);
	}
</style>
