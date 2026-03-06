<script lang="ts">
	interface CriticalClause {
		clause: string;
		risk: string;
		action: string;
		urgency: 'must' | 'should' | 'nice';
	}

	interface VendorSpecific {
		vendor: string;
		risk: string;
	}

	interface ContractResult {
		criticalClauses: CriticalClause[];
		vendorSpecific: VendorSpecific[];
		topPriority: string;
	}

	interface Props {
		projectId: string;
		category?: string;
		problem?: string;
		materials?: string;
		claimsContext?: string;
		budget?: string;
		vendors?: string;
		onresult?: (data: ContractResult) => void;
	}

	let {
		projectId, category = '', problem = '', materials = '',
		claimsContext = '', budget = '', vendors = '',
		onresult
	}: Props = $props();

	let loading = $state(false);
	let result = $state<ContractResult | null>(null);
	let error = $state('');

	async function analyze() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'contract_risk',
					depth: 'standard',
					projectId,
					context: { category, problem, materials, claimsContext, budget, vendors }
				})
			});
			if (!res.ok) throw new Error('Contract analysis failed');
			const data = await res.json();
			result = data.result as ContractResult;
			onresult?.(result);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	const urgencyColor: Record<string, string> = {
		must: '#ef4444', should: '#f59e0b', nice: '#3b82f6'
	};
	const urgencyLabel: Record<string, string> = {
		must: 'Must Negotiate', should: 'Should Negotiate', nice: 'Nice to Have'
	};
</script>

<div class="contract-risk">
	<div class="cr-header">
		<span class="cr-badge">✦ Contract Risk Analysis</span>
	</div>

	{#if !result && !loading}
		<button class="cr-trigger" onclick={analyze}>Analyze Contract Risks</button>
	{/if}

	{#if loading}
		<div class="cr-loading">
			<div class="spinner"></div>
			<span>Reviewing contract risks…</span>
		</div>
	{/if}

	{#if error}
		<div class="cr-error">{error}</div>
	{/if}

	{#if result}
		<div class="cr-results">
			{#if result.topPriority}
				<div class="cr-top-priority">
					<span class="tp-label">Top Priority</span>
					<p>{result.topPriority}</p>
				</div>
			{/if}

			{#if result.criticalClauses?.length > 0}
				<div class="cr-clauses">
					<h4>Critical Clauses</h4>
					{#each result.criticalClauses as clause}
						<div class="clause-card" style="border-left-color: {urgencyColor[clause.urgency]}">
							<div class="clause-top">
								<span class="clause-name">{clause.clause}</span>
								<span class="clause-urgency" style="color: {urgencyColor[clause.urgency]}">
									{urgencyLabel[clause.urgency]}
								</span>
							</div>
							<p class="clause-risk">{clause.risk}</p>
							<p class="clause-action">→ {clause.action}</p>
						</div>
					{/each}
				</div>
			{/if}

			{#if result.vendorSpecific?.length > 0}
				<div class="cr-vendor-specific">
					<h4>Vendor-Specific Risks</h4>
					{#each result.vendorSpecific as vs}
						<div class="vs-row">
							<span class="vs-vendor">{vs.vendor}</span>
							<span class="vs-risk">{vs.risk}</span>
						</div>
					{/each}
				</div>
			{/if}

			<button class="cr-rerun" onclick={analyze}>↻ Re-analyze</button>
		</div>
	{/if}
</div>

<style>
	.contract-risk {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px; padding: 1.25rem;
	}
	.cr-header { margin-bottom: 1rem; }
	.cr-badge { font-size: 0.8rem; font-weight: 600; color: var(--t, #00cc96); }
	.cr-trigger {
		width: 100%; padding: 0.65rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px; color: var(--t, #00cc96);
		font-size: 0.8rem; cursor: pointer;
	}
	.cr-trigger:hover { background: rgba(0, 204, 150, 0.15); }
	.cr-loading {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.75rem; color: var(--text-muted, #94a3b8); font-size: 0.8rem;
	}
	.spinner {
		width: 16px; height: 16px;
		border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: var(--t, #00cc96); border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.cr-error {
		padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}
	.cr-results { display: flex; flex-direction: column; gap: 1rem; }
	.cr-top-priority {
		background: rgba(239, 68, 68, 0.06); border-left: 3px solid #ef4444;
		padding: 0.75rem 1rem; border-radius: 0 8px 8px 0;
	}
	.tp-label {
		font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em;
		color: #f87171; font-weight: 700;
	}
	.cr-top-priority p {
		margin: 0.3rem 0 0; font-size: 0.85rem;
		color: var(--text, #e2e8f0); line-height: 1.5;
	}
	.cr-clauses h4, .cr-vendor-specific h4 {
		margin: 0 0 0.5rem; font-size: 0.7rem;
		text-transform: uppercase; letter-spacing: 0.05em;
		color: var(--text-muted, #94a3b8); font-weight: 600;
	}
	.clause-card {
		background: rgba(0, 0, 0, 0.12);
		border-left: 3px solid; border-radius: 0 8px 8px 0;
		padding: 0.65rem 0.85rem; margin-bottom: 0.5rem;
	}
	.clause-top {
		display: flex; justify-content: space-between; align-items: center;
		margin-bottom: 0.3rem;
	}
	.clause-name { font-size: 0.82rem; font-weight: 600; color: var(--text, #e2e8f0); }
	.clause-urgency {
		font-size: 0.6rem; text-transform: uppercase;
		font-weight: 700; letter-spacing: 0.04em;
	}
	.clause-risk {
		margin: 0; font-size: 0.78rem; color: var(--text-muted, #94a3b8); line-height: 1.4;
	}
	.clause-action {
		margin: 0.25rem 0 0; font-size: 0.75rem; color: var(--t, #00cc96); opacity: 0.85;
	}
	.vs-row {
		display: flex; gap: 0.75rem; padding: 0.5rem 0.75rem;
		background: rgba(0, 0, 0, 0.08); border-radius: 6px; margin-bottom: 0.3rem;
		font-size: 0.78rem;
	}
	.vs-vendor { font-weight: 600; color: var(--text, #e2e8f0); white-space: nowrap; }
	.vs-risk { color: var(--text-muted, #94a3b8); }
	.cr-rerun {
		padding: 0.3rem 0.6rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 4px; color: var(--text-muted, #64748b);
		font-size: 0.7rem; cursor: pointer; align-self: flex-start;
	}
	.cr-rerun:hover { color: var(--t, #00cc96); }
</style>
