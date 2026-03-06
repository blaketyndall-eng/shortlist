<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		if (data.session) {
			goto('/dashboard');
		} else {
			goto('/auth/login');
		}
	});
</script>

<div class="loading-screen">
	<p>Loading Shortlist…</p>
</div>

<style>
	.loading-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		color: var(--neutral-500);
		font-size: 1.125rem;
	}
</style>
