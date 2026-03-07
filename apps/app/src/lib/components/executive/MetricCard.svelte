<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		color?: string;
		icon?: 'projects' | 'alignment' | 'vendors' | 'risk' | 'participation';
	}

	let { label, value, color = 'var(--color-primary)', icon = 'projects' }: Props = $props();
</script>

<div class="metric-card">
	<div class="metric-icon" style="color: {color}">
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
			{#if icon === 'projects'}
				<rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.5"/>
				<path d="M6 7h8M6 10h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			{:else if icon === 'alignment'}
				<circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
				<path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			{:else if icon === 'vendors'}
				<path d="M3 17V7l7-4 7 4v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M7 12h6M7 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			{:else if icon === 'risk'}
				<path d="M10 3L18 17H2L10 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
				<path d="M10 9v3M10 14.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			{:else if icon === 'participation'}
				<circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
				<circle cx="14" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/>
				<path d="M1 17c0-3 2-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
			{/if}
		</svg>
	</div>
	<div class="metric-value" style="color: {color}">{value}</div>
	<div class="metric-label">{label}</div>
</div>

<style>
	.metric-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}

	.metric-icon {
		opacity: 0.8;
	}

	.metric-value {
		font-size: 2rem;
		font-weight: 700;
		font-family: var(--font-sans);
		line-height: 1;
	}

	.metric-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
</style>
