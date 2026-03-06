<script lang="ts">
	let { children } = $props();
</script>

<div class="solve-wrapper">
	{@render children()}
</div>

<style>
	.solve-wrapper {
		width: 100%;
	}
</style>
