<script lang="ts">
	interface CompareVendor {
		id: string;
		name: string;
		slug?: string;
		tagline?: string;
		tier?: string;
		size?: string;
		website?: string;
		employee_range?: string;
		founded?: string;
		hq_location?: string;
		funding_stage?: string;
		best_for?: string;
		free_trial_days?: number;
		pricing_starts_at?: string;
		features?: string[];
		compliance_certs?: string[];
		enrichment_status?: string;
		ai_overview?: string;
		ai_pricing?: string;
		ai_pricing_model?: string;
		ai_strengths?: string[];
		ai_concerns?: string[];
		ai_impl_complexity?: string;
		ai_impl_note?: string;
		ai_impl_timeline?: string;
		ai_g2_position?: string;
		ai_watch_out_for?: string[];
		ai_competitors?: string[];
		ai_target_segments?: string[];
		ai_key_integrations?: string[];
		ai_security_certs?: string[];
		ai_contract_terms?: string;
		ai_deployment_model?: string;
		ai_support_model?: string;
		ai_vendor_stability?: string;
		fitScore?: number;
		fitSignals?: string[];
		fitConcerns?: string[];
	}

	interface Props {
		vendors: CompareVendor[];
		onRemove?: (id: string) => void;
		onClose?: () => void;
	}

	let { vendors, onRemove, onClose }: Props = $props();

	function nameToHue(name: string): number {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		return Math.abs(hash) % 360;
	}

	function fitScoreColor(score: number): string {
		if (score >= 75) return '#00cc96';
		if (score >= 55) return '#d97706';
		return '#ef4444';
	}

	function implColor(complexity: string): string {
		if (complexity === 'low') return '#00cc96';
		if (complexity === 'medium') return '#d97706';
		return '#ef4444';
	}

	function parseArray(val: unknown): string[] {
		if (Array.isArray(val)) return val as string[];
		if (typeof val === 'string') {
			try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
		}
		return [];
	}

	// Find the best (highest) fit score for highlighting
	const bestFitId = $derived.by(() => {
		let best = -1;
		let bestId = '';
		for (const v of vendors) {
			if (v.fitScore && v.fitScore > best) {
				best = v.fitScore;
				bestId = v.id;
			}
		}
		return bestId;
	});

	// Comparison rows
	type RowType = 'text' | 'list' | 'score' | 'badge';

	interface CompareRow {
		label: string;
		key: string;
		type: RowType;
		getValue: (v: CompareVendor) => string | string[] | number | null;
	}

	const rows: CompareRow[] = [
		{ label: 'Fit Score', key: 'fitScore', type: 'score', getValue: (v) => v.fitScore ?? null },
		{ label: 'Overview', key: 'overview', type: 'text', getValue: (v) => v.ai_overview || v.tagline || null },
		{ label: 'Best For', key: 'bestFor', type: 'text', getValue: (v) => v.best_for || null },
		{ label: 'Pricing', key: 'pricing', type: 'text', getValue: (v) => v.ai_pricing || v.pricing_starts_at || null },
		{ label: 'Pricing Model', key: 'pricingModel', type: 'badge', getValue: (v) => v.ai_pricing_model || null },
		{ label: 'Strengths', key: 'strengths', type: 'list', getValue: (v) => parseArray(v.ai_strengths) },
		{ label: 'Concerns', key: 'concerns', type: 'list', getValue: (v) => parseArray(v.ai_concerns) },
		{ label: 'Watch Out For', key: 'watchOut', type: 'list', getValue: (v) => parseArray(v.ai_watch_out_for) },
		{ label: 'Implementation', key: 'impl', type: 'badge', getValue: (v) => v.ai_impl_complexity || null },
		{ label: 'Impl. Timeline', key: 'implTimeline', type: 'text', getValue: (v) => v.ai_impl_timeline || v.ai_impl_note || null },
		{ label: 'Key Features', key: 'features', type: 'list', getValue: (v) => parseArray(v.features) },
		{ label: 'Integrations', key: 'integrations', type: 'list', getValue: (v) => parseArray(v.ai_key_integrations) },
		{ label: 'Security & Compliance', key: 'security', type: 'list', getValue: (v) => {
			const certs = [...parseArray(v.ai_security_certs), ...parseArray(v.compliance_certs)];
			return [...new Set(certs)];
		}},
		{ label: 'Deployment', key: 'deployment', type: 'badge', getValue: (v) => v.ai_deployment_model || null },
		{ label: 'Support', key: 'support', type: 'text', getValue: (v) => v.ai_support_model || null },
		{ label: 'Contract Terms', key: 'contract', type: 'text', getValue: (v) => v.ai_contract_terms || null },
		{ label: 'G2 Position', key: 'g2', type: 'text', getValue: (v) => v.ai_g2_position || null },
		{ label: 'Target Segments', key: 'segments', type: 'list', getValue: (v) => parseArray(v.ai_target_segments) },
		{ label: 'Competitors', key: 'competitors', type: 'list', getValue: (v) => parseArray(v.ai_competitors) },
		{ label: 'Vendor Stability', key: 'stability', type: 'text', getValue: (v) => v.ai_vendor_stability || null },
		{ label: 'Company Size', key: 'size', type: 'text', getValue: (v) => v.employee_range || v.size || null },
		{ label: 'Founded', key: 'founded', type: 'text', getValue: (v) => v.founded || null },
		{ label: 'HQ', key: 'hq', type: 'text', getValue: (v) => v.hq_location || null },
		{ label: 'Funding', key: 'funding', type: 'badge', getValue: (v) => v.funding_stage || null },
		{ label: 'Free Trial', key: 'trial', type: 'text', getValue: (v) => v.free_trial_days ? `${v.free_trial_days} days` : null },
	];

	// Filter out rows where ALL vendors have no data
	const activeRows = $derived.by(() => {
		return rows.filter((row) => {
			return vendors.some((v) => {
				const val = row.getValue(v);
				if (val === null || val === undefined) return false;
				if (typeof val === 'string' && !val.trim()) return false;
				if (Array.isArray(val) && val.length === 0) return false;
				return true;
			});
		});
	});
</script>

<div class="compare-container">
	<div class="compare-header">
		<h2>Vendor Comparison</h2>
		<span class="compare-count">{vendors.length} vendor{vendors.length === 1 ? '' : 's'}</span>
		{#if onClose}
			<button class="close-btn" onclick={onClose} type="button" aria-label="Close comparison">✕</button>
		{/if}
	</div>

	<div class="compare-scroll">
		<table class="compare-table">
			<thead>
				<tr>
					<th class="label-col"></th>
					{#each vendors as v (v.id)}
						<th class="vendor-col" class:best={v.id === bestFitId && vendors.length > 1}>
							<div class="vendor-header">
								<div class="vendor-avatar" style="background: hsl({nameToHue(v.name)}, 65%, 55%)">
									{v.name.charAt(0)}
								</div>
								<div class="vendor-name-block">
									<span class="vendor-name">{v.name}</span>
									<span class="vendor-tier">{v.tier ?? ''}</span>
								</div>
								{#if onRemove}
									<button class="remove-vendor" onclick={() => onRemove(v.id)} type="button" aria-label="Remove {v.name}">✕</button>
								{/if}
							</div>
							{#if v.id === bestFitId && vendors.length > 1}
								<span class="best-badge">Best Fit</span>
							{/if}
							{#if v.slug}
								<a href="/discover/{v.slug}" class="profile-link" target="_blank">View profile →</a>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each activeRows as row (row.key)}
					<tr>
						<td class="label-cell">{row.label}</td>
						{#each vendors as v (v.id)}
							{@const val = row.getValue(v)}
							<td class="value-cell" class:best-col={v.id === bestFitId && vendors.length > 1}>
								{#if val === null || val === undefined || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)}
									<span class="no-data">—</span>
								{:else if row.type === 'score' && typeof val === 'number'}
									<div class="score-cell">
										<span class="score-number" style="color: {fitScoreColor(val)}">{val}%</span>
										<div class="score-bar">
											<div class="score-fill" style="width: {val}%; background: {fitScoreColor(val)}"></div>
										</div>
										{#if v.fitSignals && v.fitSignals.length > 0}
											<span class="score-signal">{v.fitSignals[0]}</span>
										{/if}
									</div>
								{:else if row.type === 'list' && Array.isArray(val)}
									<ul class="compare-list">
										{#each val.slice(0, 5) as item}
											<li>{item}</li>
										{/each}
										{#if val.length > 5}
											<li class="more">+{val.length - 5} more</li>
										{/if}
									</ul>
								{:else if row.type === 'badge' && typeof val === 'string'}
									<span class="compare-badge" class:impl-low={val === 'low'} class:impl-med={val === 'medium'} class:impl-high={val === 'high'}>
										{val}
									</span>
								{:else}
									<span class="text-val">{String(val)}</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.compare-container {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
	}

	.compare-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--neutral-200);
	}

	.compare-header h2 { font-size: 1.125rem; margin: 0; }
	.compare-count { font-size: 0.75rem; color: var(--neutral-400); }

	.close-btn {
		margin-left: auto;
		width: 28px; height: 28px;
		border: 1px solid var(--neutral-200); border-radius: 50%;
		background: transparent; color: var(--neutral-500);
		cursor: pointer; display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem;
	}
	.close-btn:hover { border-color: var(--neutral-400); color: var(--neutral-700); }

	.compare-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.compare-table {
		width: 100%;
		min-width: 600px;
		border-collapse: collapse;
	}

	.compare-table thead { position: sticky; top: 0; z-index: 2; }

	.label-col {
		width: 160px;
		min-width: 140px;
		background: var(--color-bg-secondary);
		position: sticky;
		left: 0;
		z-index: 3;
	}

	.vendor-col {
		min-width: 200px;
		max-width: 300px;
		padding: var(--space-3) var(--space-4);
		text-align: left;
		vertical-align: top;
		border-left: 1px solid var(--neutral-100);
		background: var(--color-bg-secondary);
	}

	.vendor-col.best {
		background: rgba(0, 204, 150, 0.03);
	}

	.vendor-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-1);
	}

	.vendor-avatar {
		width: 32px; height: 32px;
		border-radius: var(--radius-md);
		display: flex; align-items: center; justify-content: center;
		font-weight: 800; font-size: 0.875rem; color: white;
		flex-shrink: 0;
	}

	.vendor-name-block { flex: 1; min-width: 0; }
	.vendor-name { display: block; font-size: 0.9375rem; font-weight: 700; }
	.vendor-tier { display: block; font-size: 0.6875rem; color: var(--neutral-500); text-transform: capitalize; }

	.remove-vendor {
		width: 20px; height: 20px; border-radius: 50%;
		border: none; background: var(--neutral-100); color: var(--neutral-500);
		font-size: 0.625rem; cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
	}
	.remove-vendor:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

	.best-badge {
		display: inline-block;
		font-size: 0.5625rem; font-weight: 800; text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 8px; border-radius: 999px;
		background: rgba(0, 204, 150, 0.12); color: #00cc96;
		margin-bottom: var(--space-1);
	}

	.profile-link {
		display: block;
		font-size: 0.6875rem; color: var(--primary-600);
		text-decoration: none;
	}
	.profile-link:hover { text-decoration: underline; }

	.label-cell {
		padding: var(--space-3) var(--space-4);
		font-size: 0.75rem; font-weight: 600;
		color: var(--neutral-500); text-transform: uppercase;
		letter-spacing: 0.04em;
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--neutral-100);
		position: sticky; left: 0; z-index: 1;
		vertical-align: top;
	}

	.value-cell {
		padding: var(--space-3) var(--space-4);
		font-size: 0.8125rem;
		color: var(--neutral-700);
		border-top: 1px solid var(--neutral-100);
		border-left: 1px solid var(--neutral-100);
		vertical-align: top;
		line-height: 1.45;
	}

	.value-cell.best-col {
		background: rgba(0, 204, 150, 0.02);
	}

	.no-data { color: var(--neutral-300); font-size: 0.8125rem; }

	/* Score cell */
	.score-cell { display: flex; flex-direction: column; gap: 4px; }
	.score-number { font-size: 1.125rem; font-weight: 800; }
	.score-bar {
		width: 100%; height: 4px;
		background: var(--neutral-100); border-radius: 2px;
		overflow: hidden;
	}
	.score-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
	.score-signal { font-size: 0.6875rem; color: var(--neutral-500); }

	/* List */
	.compare-list {
		margin: 0; padding: 0; list-style: none;
		display: flex; flex-direction: column; gap: 3px;
	}
	.compare-list li {
		font-size: 0.8125rem; color: var(--neutral-700);
		padding-left: 12px;
		position: relative;
	}
	.compare-list li::before {
		content: '•';
		position: absolute; left: 0; color: var(--neutral-400);
	}
	.compare-list li.more {
		color: var(--neutral-400); font-style: italic; font-size: 0.75rem;
	}
	.compare-list li.more::before { content: ''; }

	/* Badge */
	.compare-badge {
		display: inline-block;
		font-size: 0.6875rem; font-weight: 700;
		padding: 2px 10px; border-radius: 999px;
		text-transform: capitalize;
		background: var(--neutral-100); color: var(--neutral-600);
	}
	.compare-badge.impl-low { background: rgba(0, 204, 150, 0.1); color: #00cc96; }
	.compare-badge.impl-med { background: rgba(217, 119, 6, 0.1); color: #d97706; }
	.compare-badge.impl-high { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

	.text-val { white-space: pre-wrap; }

	@media (max-width: 768px) {
		.label-col { width: 120px; min-width: 100px; }
		.vendor-col { min-width: 180px; }
		.label-cell { font-size: 0.6875rem; padding: var(--space-2) var(--space-3); }
		.value-cell { font-size: 0.75rem; padding: var(--space-2) var(--space-3); }
	}
</style>
