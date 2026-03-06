<script lang="ts">
	interface Anomaly {
		vendor: string;
		criterion: string | null;
		severity: 'high' | 'medium' | 'low';
		flag: string;
		suggestion: string;
	}

	interface Props {
		projectId: string;
		evaluationName?: string;
		criteriaDescription?: string;
		scoreSummary?: string;
		onresult?: (anomalies: Anomaly[]) => void;
	}

	let {
		projectId,
		evaluationName = '',
		criteriaDescription = '',
		scoreSummary = '',
		onresult
	}: Props = $props();

	let loading = $state(false);
	let anomalies = $state<Anomaly[]>([]);
	let hasRun = $state(false);
	let error = $state('');

	async function detect() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'score_anomaly',
					depth: 'standard',
					projectId,
					context: { evaluationName, criteriaDescription, scoreSummary }
				})
			});
			if (!res.ok) throw new Error('Analysis failed');
			const data = await res.json();
			anomalies = Array.isArray(data.result) ? data.result : [];
			hasRun = true;
			onresult?.(anomalies);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	const severityColor: Record<string, string> = {
		high: '#ef4444',
		medium: '#f59e0b',
		low: '#3b82f6'
	};

	const severityIcon: Record<string, string> = {
		high: '🔴',
		medium: '🟡',
		low: '🔵'
	};
</script>

<div class="anomaly-detector">
	<div class="det-header">
		<span class="det-badge">✦ Score Anomaly Detection</span>
		{#if hasRun}
			<span class="det-count" class:clean={anomalies.length === 0}>
				{anomalies.length === 0 ? 'No anomalies found' : `${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected`}
			</span>
		{/if}
	</div>

	{#if !hasRun && !loading}
		<button class="det-trigger" onclick={detect}>
			Scan for Score Anomalies
		</button>
	{/if}

	{#if loading}
		<div class="det-loading">
			<div class="spinner"></div>
			<span>Scanning scores for inconsistencies…</span>
		</div>
	{/if}

	{#if error}
		<div class="det-error">{error}</div>
	{/if}

	{#if hasRun && anomalies.length > 0}
		<div class="anomaly-list">
			{#each anomalies as anomaly}
				<div class="anomaly-card" style="border-left-color: {severityColor[anomaly.severity]}">
					<div class="anomaly-top">
						<span class="sev-icon">{severityIcon[anomaly.severity]}</span>
						<span class="anomaly-vendor">{anomaly.vendor}</span>
						{#if anomaly.criterion}
							<span class="anomaly-crit">· {anomaly.criterion}</span>
						{/if}
						<span class="sev-label" style="color: {severityColor[anomaly.severity]}">{anomaly.severity}</span>
					</div>
					<p class="anomaly-flag">{anomaly.flag}</p>
					<p class="anomaly-suggestion">→ {anomaly.suggestion}</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if hasRun && anomalies.length === 0}
		<div class="det-clean">
			<span>✓</span> Scores look consistent — no anomalies detected.
		</div>
	{/if}

	{#if hasRun}
		<button class="det-rerun" onclick={detect}>↻ Re-scan</button>
	{/if}
</div>

<style>
	.anomaly-detector {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px;
		padding: 1.25rem;
	}
	.det-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}
	.det-badge {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--t, #00cc96);
	}
	.det-count {
		font-size: 0.75rem;
		color: #f59e0b;
		font-weight: 500;
	}
	.det-count.clean {
		color: var(--t, #00cc96);
	}
	.det-trigger {
		width: 100%;
		padding: 0.65rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px;
		color: var(--t, #00cc96);
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.det-trigger:hover {
		background: rgba(0, 204, 150, 0.15);
	}
	.det-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		color: var(--text-muted, #94a3b8);
		font-size: 0.8rem;
	}
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: var(--t, #00cc96);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.det-error {
		padding: 0.5rem;
		background: rgba(239, 68, 68, 0.08);
		border-radius: 6px;
		color: #f87171;
		font-size: 0.8rem;
	}
	.anomaly-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.anomaly-card {
		background: rgba(0, 0, 0, 0.15);
		border-left: 3px solid;
		border-radius: 0 8px 8px 0;
		padding: 0.75rem 1rem;
	}
	.anomaly-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		margin-bottom: 0.4rem;
	}
	.sev-icon { font-size: 0.7rem; }
	.anomaly-vendor {
		font-weight: 600;
		color: var(--text, #e2e8f0);
	}
	.anomaly-crit {
		color: var(--text-muted, #94a3b8);
	}
	.sev-label {
		margin-left: auto;
		font-size: 0.65rem;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.05em;
	}
	.anomaly-flag {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text, #e2e8f0);
		line-height: 1.5;
	}
	.anomaly-suggestion {
		margin: 0.3rem 0 0;
		font-size: 0.75rem;
		color: var(--t, #00cc96);
		opacity: 0.8;
	}
	.det-clean {
		padding: 1rem;
		text-align: center;
		color: var(--t, #00cc96);
		font-size: 0.85rem;
	}
	.det-rerun {
		margin-top: 0.75rem;
		padding: 0.3rem 0.6rem;
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 4px;
		color: var(--text-muted, #64748b);
		font-size: 0.7rem;
		cursor: pointer;
	}
	.det-rerun:hover {
		color: var(--t, #00cc96);
		border-color: rgba(0, 204, 150, 0.2);
	}
</style>
