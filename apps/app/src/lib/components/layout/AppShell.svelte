<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { UserProfile } from '@shortlist/shared-types/auth';
	import Sidebar from './Sidebar.svelte';
	import Navbar from './Navbar.svelte';

	interface Props {
		profile: UserProfile | null;
		children: Snippet;
	}

	let { profile, children }: Props = $props();
	let sidebarOpen = $state(true);
</script>

<div class="app-shell" class:sidebar-collapsed={!sidebarOpen}>
	<Sidebar {profile} bind:open={sidebarOpen} />

	<div class="app-main">
		<Navbar {profile} onToggleSidebar={() => (sidebarOpen = !sidebarOpen)} />

		<main class="app-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) 1fr;
		min-height: 100vh;
		transition: grid-template-columns var(--transition-normal);
	}

	.app-shell.sidebar-collapsed {
		grid-template-columns: 0 1fr;
	}

	.app-main {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		overflow-x: hidden;
	}

	.app-content {
		flex: 1;
		background: var(--color-bg);
		position: relative;
		z-index: 1;
	}

	@media (max-width: 768px) {
		.app-shell {
			grid-template-columns: 0 1fr;
		}
	}
</style>
