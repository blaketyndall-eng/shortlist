<script lang="ts">
	import type { UserProfile } from '@shortlist/shared-types/auth';
	import { page } from '$app/stores';

	interface Props {
		profile: UserProfile | null;
		open: boolean;
	}

	let { profile, open = $bindable() }: Props = $props();

	const navItems = [
		{ label: 'Dashboard', href: '/dashboard', icon: '◻' },
		{ label: 'Projects', href: '/projects', icon: '▦' },
		{ label: 'Discover', href: '/discover', icon: '🔍' },
		{ label: 'Compare', href: '/compare', icon: '⇄' },
		{ label: 'Teams', href: '/account/teams', icon: '👥' },
		{ label: 'Account', href: '/account', icon: '⚙' }
	];
</script>

<aside class="sidebar" class:open aria-label="Main navigation">
	<div class="sidebar-header">
		<a href="/dashboard" class="logo">
			<span class="logo-text">Short<em class="logo-accent">list</em></span>
		</a>
	</div>

	<nav class="sidebar-nav">
		{#each navItems as item}
			<a
				href={item.href}
				class="nav-item"
				class:active={$page.url.pathname.startsWith(item.href)}
				aria-current={$page.url.pathname.startsWith(item.href) ? 'page' : undefined}
			>
				<span class="nav-icon">{item.icon}</span>
				<span class="nav-label">{item.label}</span>
			</a>
		{/each}
	</nav>

	<div class="sidebar-footer">
		{#if profile}
			<div class="user-info">
				<div class="avatar">
					{profile.full_name?.charAt(0) ?? profile.email.charAt(0)}
				</div>
				<div class="user-details">
					<span class="user-name">{profile.full_name ?? 'User'}</span>
					<span class="user-role">{profile.role}</span>
				</div>
			</div>
		{/if}
	</div>
</aside>

<style>
	.sidebar {
		background: var(--neutral-100);
		border-right: 1px solid var(--neutral-200);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		width: var(--sidebar-width);
		transition: width var(--transition-normal), opacity var(--transition-normal);
	}

	.sidebar:not(.open) {
		width: 0;
		opacity: 0;
		pointer-events: none;
	}

	.sidebar-header {
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--neutral-200);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		text-decoration: none;
		font-family: var(--font-display);
		color: var(--tx);
		font-weight: 700;
		font-size: 19px;
	}

	.logo:hover { text-decoration: none; }

	:global(.logo-accent) {
		color: var(--t);
		font-family: var(--font-display);
		font-style: normal;
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-3) var(--space-2);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--neutral-600);
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.nav-item:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--neutral-900);
		text-decoration: none;
	}

	.nav-item.active {
		background: var(--primary-50);
		color: var(--primary-500);
	}

	.nav-icon {
		font-size: 1rem;
		width: 20px;
		text-align: center;
	}

	.sidebar-footer {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--neutral-200);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--primary-100);
		color: var(--primary-500);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.user-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--neutral-800);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-role {
		font-size: 0.6875rem;
		color: var(--neutral-500);
		text-transform: capitalize;
	}
</style>
