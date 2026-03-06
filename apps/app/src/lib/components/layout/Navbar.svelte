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
		background: white;
		border-bottom: 1px solid var(--neutral-200);
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
		color: var(--neutral-500);
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
	}

	.sidebar-toggle:hover {
		color: var(--neutral-900);
	}

	.navbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.logout-btn {
		background: none;
		border: 1px solid var(--neutral-300);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--neutral-600);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.logout-btn:hover {
		background: var(--neutral-50);
		color: var(--neutral-900);
	}
</style>
