<script lang="ts">
	interface Props {
		message: string;
		type?: 'info' | 'warning' | 'success';
		href?: string;
		onDismiss?: () => void;
	}

	let { message, type = 'info', href, onDismiss }: Props = $props();

	const colors = {
		info: { bg: 'var(--color-primary)', text: '#fff' },
		warning: { bg: '#f59e0b', text: '#000' },
		success: { bg: '#10b981', text: '#fff' },
	};

	const c = $derived(colors[type]);
</script>

{#if message}
	<div class="banner" style="background: {c.bg}; color: {c.text}">
		<div class="banner-content">
			{#if href}
				<a {href} class="banner-link" style="color: {c.text}">{message}</a>
			{:else}
				<span>{message}</span>
			{/if}
		</div>
		{#if onDismiss}
			<button class="dismiss" style="color: {c.text}" onclick={onDismiss}>&times;</button>
		{/if}
	</div>
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
		border-radius: var(--radius-lg);
		font-size: 0.8125rem;
		font-weight: 600;
		margin-bottom: 16px;
	}

	.banner-content {
		flex: 1;
	}

	.banner-link {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.banner-link:hover {
		opacity: 0.9;
	}

	.dismiss {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0 4px;
		opacity: 0.8;
		line-height: 1;
	}

	.dismiss:hover {
		opacity: 1;
	}
</style>
