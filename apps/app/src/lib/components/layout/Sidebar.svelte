<script lang="ts">
	import type { UserProfile } from '@shortlist/shared-types/auth';
	import { hasPermission } from '@shortlist/shared-types/auth';
	import type { TeamRole } from '@shortlist/shared-types/auth';
	import { page } from '$app/stores';

	interface Props {
		profile: UserProfile | null;
		open: boolean;
	}

	let { profile, open = $bindable() }: Props = $props();

	const canViewExec = $derived(
		profile?.role ? hasPermission(profile.role as TeamRole, 'canViewExecutiveDashboard') : false
	);

	const baseNavItems = [
		{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
		{ label: 'Projects', href: '/projects', icon: 'projects' },
		{ label: 'Discover', href: '/discover', icon: 'discover' },
		{ label: 'Compare', href: '/compare', icon: 'compare' },
		{ label: 'Teams', href: '/account/teams', icon: 'teams' },
		{ label: 'Account', href: '/account', icon: 'account' }
	];

	const navItems = $derived(
		canViewExec
			? [...baseNavItems.slice(0, 4), { label: 'Executive', href: '/executive', icon: 'executive' }, ...baseNavItems.slice(4)]
			: baseNavItems
	);
</script>

<aside class="sidebar" class:open aria-label="Main navigation">
	<div class="sidebar-header">
		<a href="/dashboard" class="logo">
			<span class="logo-text">Short<em>list</em></span>
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
				<svg class="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
					{#if item.icon === 'dashboard'}
						<rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
						<rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
						<rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
						<rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
					{:else if item.icon === 'projects'}
						<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
						<path d="M5 6h6M5 8.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					{:else if item.icon === 'discover'}
						<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"/>
						<path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					{:else if item.icon === 'compare'}
						<path d="M4 2v12M12 2v12M1 8h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					{:else if item.icon === 'teams'}
						<circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.4"/>
						<path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					{:else if item.icon === 'executive'}
						<path d="M2 13V5l6-3 6 3v8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M5 8h6M5 10.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					{:else if item.icon === 'account'}
						<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/>
						<path d="M10.5 6.5L7 10l-1.5-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
					{/if}
				</svg>
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
		background: var(--color-bg-secondary);
		border-right: 1px solid var(--color-border);
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
		padding: 16px 20px;
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: var(--color-text-heading);
	}

	.logo-text {
		font-family: var(--font-serif);
		font-size: 19px;
		font-weight: 700;
		color: var(--color-text-heading);
	}

	.logo-text em {
		color: var(--color-primary);
		font-style: normal;
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-3) var(--space-2);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: var(--radius-lg);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--text-sm);
		font-weight: 500;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.nav-item:hover {
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-text);
		text-decoration: none;
	}

	.nav-item.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}

	.nav-icon {
		flex-shrink: 0;
		opacity: 0.8;
	}

	.nav-item.active .nav-icon {
		opacity: 1;
	}

	.sidebar-footer {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
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
		background: var(--color-primary-light);
		color: var(--color-primary);
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
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-role {
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}
</style>
