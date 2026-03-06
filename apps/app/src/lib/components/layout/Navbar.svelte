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
			<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
				<path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			</svg>
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
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
		position: sticky;
		top: 0;
		z-index: var(--z-nav);
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
		color: var(--color-text-secondary);
		padding: 6px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--transition-fast), background var(--transition-fast);
	}

	.sidebar-toggle:hover {
		color: var(--color-text);
		background: rgba(255, 255, 255, 0.04);
	}

	.navbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.logout-btn {
		background: none;
		border: 1px solid var(--color-border-strong);
		padding: 5px 14px;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		font-family: var(--font-sans);
		transition: all var(--transition-fast);
	}

	.logout-btn:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.2);
		color: var(--color-text);
	}
</style>
