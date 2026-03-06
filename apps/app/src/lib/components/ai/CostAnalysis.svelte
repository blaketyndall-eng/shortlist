<script lang="ts">
	interface HiddenCost {
		category: string;
		risk: string;
		typicalOverrun: string;
		priority: 'high' | 'medium' | 'low';
	}

	interface CostResult {
		hiddenCosts: HiddenCost[];
		negotiableItems: string[];
		totalRiskAddition: string;
		topAdvice: string;
	}

	interface Props {
		projectId: string;
		vendor?: string;
		category?: string;
		problem?: string;
		teamSize?: string;
		year1Cost?: string;
		budget?: string;
		license?: string;
		impl?: string;
		training?: string;
		onresult?: (data: CostResult) => void;
	}

	let {
		projectId, vendor = '', category = '', problem = '',
		teamSize = '', year1Cost = '', budget = '',
		license = '', impl = '', training = '',
		onresult
	}: Props = $props();

	let loading = $state(false);
	let result = $state<CostResult | null>(null);
	let error = $state('');

	async function analyze() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'hidden_cost_spotter',
					depth: 'standard',
					projectId,
					context: { vendor, category, problem, teamSize, year1Cost, budget, license, impl, training }
				})
			});
			if (!res.ok) throw new Error('Cost analysis failed');
			const data = await res.json();
			result = data.result as CostResult;
			onresult?.(result);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	const priorityColor: Record<string, string> = {
		high: '#ef4444', medium: '#f59e0b', low: '#3b82f6'
	};
</script>

<div class="cost-analysis">
	<div class="cost-header">
		<span class="cost-badge">✦ Hidden Cost Spotter</span>
		{#if vendor}
			<span class="cost-vendor">{vendor}</span>
		{/if}
	</div>

	{#if !result && !loading}
		<button class="cost-trigger" onclick={analyze}>Spot Hidden Costs</button>
	{/if}

	{#if loading}
		<div class="cost-loading">
			<div class="spinner"></div>
			<span>Analyzing cost structure…</span>
		</div>
	{/if}

	{#if error}
		<div class="cost-error">{error}</div>
	{/if}

	{#if result}
		<div class="cost-results">
			{#if result.topAdvice}
				<div class="top-advice">
					<span class="advice-icon">💡</span>
					<p>{result.topAdvice}</p>
				</div>
			{/if}

			{#if result.totalRiskAddition}
				<div class="risk-total">
					<span class="risk-label">Estimated Risk Addition</span>
					<span class="risk-value">{result.totalRiskAddition}</span>
				</div>
			{/if}

			{#if result.hiddenCosts?.length > 0}
				<div class="costs-section">
					<h4>Hidden Costs</h4>
					{#each result.hiddenCosts as cost}
						<div class="cost-row">
							<div class="cost-row-top">
								<span class="cost-cat">{cost.category}</span>
								<span class="cost-overrun">{cost.typicalOverrun}</span>
								<span class="cost-pri" style="color: {priorityColor[cost.priority]}">{cost.priority}</span>
							</div>
							<p class="cost-risk">{cost.risk}</p>
						</div>
					{/each}
				</div>
			{/if}

			{#if result.negotiableItems?.length > 0}
				<div class="neg-items">
					<h4>Negotiable Items</h4>
					<div class="neg-chips">
						{#each result.negotiableItems as item}
							<span class="neg-chip">{item}</span>
						{/each}
					</div>
				</div>
			{/if}

			<button class="cost-rerun" onclick={analyze}>↻ Re-analyze</button>
		</div>
	{/if}
</div>

<style>
	.cost-analysis {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px;
		padding: 1.25rem;
	}
	.cost-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.cost-badge { font-size: 0.8rem; font-weight: 600; color: var(--t, #00cc96); }
	.cost-vendor { font-size: 0.8rem; color: var(--text-muted, #94a3b8); }
	.cost-trigger {
		width: 100%; padding: 0.65rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px; color: var(--t, #00cc96);
		font-size: 0.8rem; cursor: pointer;
	}
	.cost-trigger:hover { background: rgba(0, 204, 150, 0.15); }
	.cost-loading {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.75rem; color: var(--text-muted, #94a3b8); font-size: 0.8rem;
	}
	.spinner {
		width: 16px; height: 16px;
		border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: var(--t, #00cc96);
		border-radius: 50%; animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.cost-error {
		padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}
	.cost-results {
		display: flex; flex-direction: column; gap: 1rem;
	}
	.top-advice {
		display: flex; gap: 0.75rem; align-items: flex-start;
		background: rgba(0, 204, 150, 0.06);
		padding: 0.75rem 1rem; border-radius: 8px;
	}
	.advice-icon { font-size: 1.2rem; flex-shrink: 0; }
	.top-advice p {
		margin: 0; font-size: 0.85rem;
		color: var(--text, #e2e8f0); line-height: 1.5;
	}
	.risk-total {
		display: flex; justify-content: space-between; align-items: center;
		background: rgba(239, 68, 68, 0.06); padding: 0.65rem 1rem;
		border-radius: 8px; border-left: 3px solid #ef4444;
	}
	.risk-label {
		font-size: 0.75rem; color: var(--text-muted, #94a3b8);
		text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
	}
	.risk-value {
		font-size: 0.9rem; font-weight: 600; color: #f87171;
		font-family: 'Playfair Display', serif;
	}
	.costs-section h4, .neg-items h4 {
		margin: 0 0 0.5rem; font-size: 0.7rem;
		text-transform: uppercase; letter-spacing: 0.05em;
		color: var(--text-muted, #94a3b8); font-weight: 600;
	}
	.cost-row {
		background: rgba(0, 0, 0, 0.12); border-radius: 6px;
		padding: 0.6rem 0.75rem; margin-bottom: 0.4rem;
	}
	.cost-row-top {
		display: flex; align-items: center; gap: 0.5rem;
		font-size: 0.75rem; margin-bottom: 0.25rem;
	}
	.cost-cat { font-weight: 600; color: var(--text, #e2e8f0); }
	.cost-overrun {
		margin-left: auto; color: #f59e0b;
		font-weight: 500; font-size: 0.7rem;
	}
	.cost-pri {
		font-size: 0.6rem; text-transform: uppercase;
		font-weight: 700; letter-spacing: 0.05em;
	}
	.cost-risk {
		margin: 0; font-size: 0.78rem; color: var(--text-muted, #94a3b8); line-height: 1.4;
	}
	.neg-chips {
		display: flex; flex-wrap: wrap; gap: 0.4rem;
	}
	.neg-chip {
		padding: 0.25rem 0.6rem; background: rgba(0, 204, 150, 0.08);
		border: 1px solid rgba(0, 204, 150, 0.15); border-radius: 20px;
		font-size: 0.72rem; color: var(--t, #00cc96);
	}
	.cost-rerun {
		padding: 0.3rem 0.6rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 4px; color: var(--text-muted, #64748b);
		font-size: 0.7rem; cursor: pointer; align-self: flex-start;
	}
	.cost-rerun:hover { color: var(--t, #00cc96); }
</style>
