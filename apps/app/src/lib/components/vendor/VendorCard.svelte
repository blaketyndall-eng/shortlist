<script lang="ts">
	interface Props {
		vendor: {
			id: string;
			name: string;
			slug: string;
			category_id: string;
			tagline?: string;
			description?: string;
			ai_overview?: string;
			size?: string;
			tier?: string;
			trust_tier?: string;
			is_verified?: boolean;
			avg_rating?: number;
			pricing_starts_at?: string;
			free_trial_days?: number;
			integration_count?: number;
			enrichment_status?: string;
		};
		categoryName?: string;
	}

	let { vendor, categoryName }: Props = $props();

	// Hash name to hue for consistent avatar color
	function nameToHue(name: string): number {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return Math.abs(hash) % 360;
	}

	const hue = $derived(nameToHue(vendor.name));
	const initial = $derived(vendor.name.charAt(0).toUpperCase());
	const snippet = $derived.by(() => {
		const text = vendor.description || vendor.ai_overview || vendor.tagline || '';
		return text.length > 110 ? text.slice(0, 107) + '...' : text;
	});

	const tierLabel = $derived.by(() => {
		const t = vendor.tier ?? vendor.size ?? '';
		switch (t) {
			case 'smb': return 'SMB';
			case 'mid-market': return 'Mid-Market';
			case 'enterprise': return 'Enterprise';
			case 'all': return 'All Tiers';
			case 'startup': return 'Startup';
			default: return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
		}
	});
</script>

<a href="/discover/{vendor.slug}" class="vendor-card-link">
	<div class="vendor-card">
		<div class="card-top">
			<div class="avatar" style="background: hsl({hue}, 65%, 55%)">
				{initial}
			</div>
			<div class="card-header">
				<div class="name-row">
					<h3>{vendor.name}</h3>
					{#if vendor.is_verified || vendor.trust_tier === 'verified'}
						<span class="verified">✓</span>
					{/if}
				</div>
				<span class="category">{categoryName ?? vendor.category_id?.replace(/-/g, ' ') ?? ''}</span>
			</div>
		</div>

		{#if snippet}
			<p class="snippet">{snippet}</p>
		{/if}

		<div class="tags">
			{#if tierLabel}
				<span class="tag tier">{tierLabel}</span>
			{/if}
			{#if vendor.pricing_starts_at}
				<span class="tag pricing">{vendor.pricing_starts_at}</span>
			{/if}
			{#if vendor.enrichment_status === 'enriched'}
				<span class="tag enriched">AI Enriched</span>
			{/if}
		</div>

		<div class="card-footer">
			<div class="footer-stats">
				{#if vendor.free_trial_days && vendor.free_trial_days > 0}
					<span class="stat">{vendor.free_trial_days}d trial</span>
				{/if}
				{#if vendor.integration_count && vendor.integration_count > 0}
					<span class="stat">{vendor.integration_count}+ integrations</span>
				{/if}
				{#if vendor.avg_rating}
					<span class="stat rating">⭐ {vendor.avg_rating}</span>
				{/if}
			</div>
			<span class="view-link">View →</span>
		</div>
	</div>
</a>

<style>
	.vendor-card-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.vendor-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		height: 100%;
	}

	.vendor-card:hover {
		border-color: var(--primary-300);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 800;
		font-size: 1.125rem;
		color: white;
		flex-shrink: 0;
	}

	.card-header { flex: 1; min-width: 0; }

	.name-row {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.name-row h3 {
		font-size: 0.9375rem;
		font-weight: 700;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.verified {
		color: var(--success-600, #16a34a);
		font-size: 0.75rem;
		font-weight: 700;
	}

	.category {
		font-size: 0.6875rem;
		color: var(--neutral-500);
		text-transform: capitalize;
	}

	.snippet {
		font-size: 0.8125rem;
		color: var(--neutral-600);
		line-height: 1.4;
		margin: 0;
	}

	.tags {
		display: flex;
		gap: var(--space-1);
		flex-wrap: wrap;
	}

	.tag {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		text-transform: capitalize;
	}

	.tag.tier { background: var(--primary-50); color: var(--primary-700); }
	.tag.pricing { background: var(--neutral-100); color: var(--neutral-600); }
	.tag.enriched {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
		color: #7c3aed;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: var(--space-2);
		border-top: 1px solid var(--neutral-100);
	}

	.footer-stats {
		display: flex;
		gap: var(--space-3);
	}

	.stat {
		font-size: 0.6875rem;
		color: var(--neutral-500);
	}

	.stat.rating { color: var(--neutral-700); font-weight: 600; }

	.view-link {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary-600);
	}
</style>
