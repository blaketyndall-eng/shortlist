<script lang="ts">
	interface CoachResult {
		overallAssessment: string;
		benchmarkInsight: string;
		counterAsks: string[];
		redFlags: string[];
		walkAwaySignal: string;
		nextMove: string;
	}

	interface Props {
		projectId: string;
		vendor?: string;
		category?: string;
		problem?: string;
		teamSize?: string;
		budget?: string;
		year1Cost?: string;
		negotiationLog?: string;
		onresult?: (data: CoachResult) => void;
	}

	let {
		projectId,
		vendor = '',
		category = '',
		problem = '',
		teamSize = '',
		budget = '',
		year1Cost = '',
		negotiationLog = '',
		onresult
	}: Props = $props();

	let loading = $state(false);
	let result = $state<CoachResult | null>(null);
	let error = $state('');

	async function getCoaching() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'negotiation_coach',
					depth: 'standard',
					projectId,
					context: { vendor, category, problem, teamSize, budget, year1Cost, negotiationLog }
				})
			});
			if (!res.ok) throw new Error('Coaching analysis failed');
			const data = await res.json();
			result = data.result as CoachResult;
			onresult?.(result);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}
</script>

<div class="neg-coach">
	<div class="coach-header">
		<span class="coach-badge">✦ Negotiation Coach</span>
		{#if vendor}
			<span class="coach-vendor">for {vendor}</span>
		{/if}
	</div>

	{#if !result && !loading}
		<button class="coach-trigger" onclick={getCoaching}>
			Get Negotiation Coaching
		</button>
	{/if}

	{#if loading}
		<div class="coach-loading">
			<div class="spinner"></div>
			<span>Analyzing negotiation position…</span>
		</div>
	{/if}

	{#if error}
		<div class="coach-error">{error}</div>
	{/if}

	{#if result}
		<div class="coach-results">
			<div class="coach-section assessment">
				<h4>Assessment</h4>
				<p>{result.overallAssessment}</p>
			</div>

			<div class="coach-section benchmark">
				<h4>Benchmark Insight</h4>
				<p>{result.benchmarkInsight}</p>
			</div>

			{#if result.counterAsks?.length > 0}
				<div class="coach-section">
					<h4>Counter-Asks</h4>
					<ul class="coach-list asks">
						{#each result.counterAsks as ask}
							<li>{ask}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if result.redFlags?.length > 0}
				<div class="coach-section">
					<h4>Red Flags</h4>
					<ul class="coach-list flags">
						{#each result.redFlags as flag}
							<li>{flag}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="coach-grid">
				<div class="coach-card walkaway">
					<span class="card-label">Walk-Away Signal</span>
					<p>{result.walkAwaySignal}</p>
				</div>
				<div class="coach-card nextmove">
					<span class="card-label">Next Move</span>
					<p>{result.nextMove}</p>
				</div>
			</div>

			<button class="coach-rerun" onclick={getCoaching}>↻ Re-analyze</button>
		</div>
	{/if}
</div>

<style>
	.neg-coach {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px;
		padding: 1.25rem;
	}
	.coach-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.coach-badge {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--t, #00cc96);
	}
	.coach-vendor {
		font-size: 0.8rem;
		color: var(--text-muted, #94a3b8);
	}
	.coach-trigger {
		width: 100%;
		padding: 0.65rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px;
		color: var(--t, #00cc96);
		font-size: 0.8rem;
		cursor: pointer;
	}
	.coach-trigger:hover { background: rgba(0, 204, 150, 0.15); }
	.coach-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		color: var(--text-muted, #94a3b8);
		font-size: 0.8rem;
	}
	.spinner {
		width: 16px; height: 16px;
		border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: var(--t, #00cc96);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.coach-error {
		padding: 0.5rem;
		background: rgba(239, 68, 68, 0.08);
		border-radius: 6px;
		color: #f87171;
		font-size: 0.8rem;
	}
	.coach-results {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.coach-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted, #94a3b8);
		font-weight: 600;
	}
	.coach-section p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text, #e2e8f0);
		line-height: 1.5;
	}
	.assessment {
		background: rgba(0, 204, 150, 0.06);
		padding: 0.75rem 1rem;
		border-radius: 8px;
	}
	.benchmark {
		background: rgba(74, 150, 248, 0.06);
		padding: 0.75rem 1rem;
		border-radius: 8px;
	}
	.benchmark h4 { color: var(--bl, #4a96f8); }
	.coach-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.coach-list li {
		font-size: 0.8rem;
		color: var(--text, #e2e8f0);
		padding-left: 1.2rem;
		position: relative;
	}
	.coach-list.asks li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--t, #00cc96);
	}
	.coach-list.flags li::before {
		content: '⚠';
		position: absolute;
		left: 0;
		font-size: 0.7rem;
	}
	.coach-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.coach-card {
		background: rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		padding: 0.75rem;
	}
	.card-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted, #64748b);
		font-weight: 600;
	}
	.coach-card p {
		margin: 0.3rem 0 0;
		font-size: 0.8rem;
		color: var(--text, #e2e8f0);
		line-height: 1.4;
	}
	.walkaway { border-left: 2px solid #ef4444; }
	.nextmove { border-left: 2px solid var(--t, #00cc96); }
	.coach-rerun {
		padding: 0.3rem 0.6rem;
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 4px;
		color: var(--text-muted, #64748b);
		font-size: 0.7rem;
		cursor: pointer;
		align-self: flex-start;
	}
	.coach-rerun:hover {
		color: var(--t, #00cc96);
		border-color: rgba(0, 204, 150, 0.2);
	}
</style>
