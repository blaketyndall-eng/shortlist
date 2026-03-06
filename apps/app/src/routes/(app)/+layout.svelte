<script lang="ts">
	import AppShell from '$components/layout/AppShell.svelte';

	let { data, children } = $props();
</script>

<AppShell profile={data.profile}>
	{@render children()}
</AppShell>
