<script lang="ts">
	interface ReadinessQuestion {
		type: 'pre-mortem' | 'perspective' | 'assumption' | 'minority' | 'reversibility';
		question: string;
		why: string;
	}

	interface ReadinessResult {
		questions: ReadinessQuestion[];
	}

	interface Props {
		projectId: string;
		evaluationName?: string;
		topVendors?: Array<{ name: string; score: number }>;
		vendorCount?: number;
		keyCriteria?: string;
		evaluatorCount?: number;
		onresult?: (data: ReadinessResult) => void;
	}

	let {
		projectId, evaluationName = '', topVendors = [],
		vendorCount = 0, keyCriteria = '', evaluatorCount = 0,
		onresult
	}: Props = $props();

	let loading = $state(false);
	let result = $state<ReadinessResult | null>(null);
	let error = $state('');
	let answers = $state<Record<number, 'yes' | 'no' | 'unsure'>>({});

	async function assess() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'decision_readiness',
					depth: 'standard',
					projectId,
					context: { evaluationName, topVendors, vendorCount, keyCriteria, evaluatorCount }
				})
			});
			if (!res.ok) throw new Error('Assessment failed');
			const data = await res.json();
			result = data.result as ReadinessResult;
			onresult?.(result);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	const typeIcon: Record<string, string> = {
		'pre-mortem': '💀',
		perspective: '👁',
		assumption: '🔍',
		minority: '🗣',
		reversibility: '↩️'
	};

	const typeColor: Record<string, string> = {
		'pre-mortem': '#ef4444',
		perspective: '#8b5cf6',
		assumption: '#f59e0b',
		minority: '#3b82f6',
		reversibility: '#06b6d4'
	};

	let readinessScore = $derived.by(() => {
		const total = result?.questions?.length ?? 0;
		if (total === 0) return 0;
		const answered = Object.keys(answers).length;
		const yeses = Object.values(answers).filter((a) => a === 'yes').length;
		if (answered < total) return -1; // incomplete
		return Math.round((yeses / total) * 100);
	});
</script>

<div class="readiness">
	<div class="ra-header">
		<span class="ra-badge">✦ Decision Readiness</span>
		{#if result && readinessScore >= 0}
			<span class="ra-score" class:high={readinessScore >= 80} class:mid={readinessScore >= 50 && readinessScore < 80} class:low={readinessScore < 50}>
				{readinessScore}% ready
			</span>
		{/if}
	</div>

	{#if !result && !loading}
		<button class="ra-trigger" onclick={assess}>
			Run Decision Readiness Check
		</button>
	{/if}

	{#if loading}
		<div class="ra-loading">
			<div class="spinner"></div>
			<span>Generating Socratic questions…</span>
		</div>
	{/if}

	{#if error}
		<div class="ra-error">{error}</div>
	{/if}

	{#if result?.questions}
		<div class="ra-questions">
			{#each result.questions as q, i}
				<div class="ra-question" style="border-left-color: {typeColor[q.type]}">
					<div class="rq-top">
						<span class="rq-icon">{typeIcon[q.type]}</span>
						<span class="rq-type" style="color: {typeColor[q.type]}">{q.type}</span>
					</div>
					<p class="rq-text">{q.question}</p>
					<p class="rq-why">{q.why}</p>
					<div class="rq-answer">
						<button
							class="ans-btn"
							class:active={answers[i] === 'yes'}
							onclick={() => (answers[i] = 'yes')}
						>✓ Yes</button>
						<button
							class="ans-btn no"
							class:active={answers[i] === 'no'}
							onclick={() => (answers[i] = 'no')}
						>✗ No</button>
						<button
							class="ans-btn unsure"
							class:active={answers[i] === 'unsure'}
							onclick={() => (answers[i] = 'unsure')}
						>? Unsure</button>
					</div>
				</div>
			{/each}
		</div>

		<button class="ra-rerun" onclick={assess}>↻ New questions</button>
	{/if}
</div>

<style>
	.readiness {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px; padding: 1.25rem;
	}
	.ra-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 1rem;
	}
	.ra-badge { font-size: 0.8rem; font-weight: 600; color: var(--t, #00cc96); }
	.ra-score {
		font-size: 0.85rem; font-weight: 700;
		font-family: 'Playfair Display', serif;
	}
	.ra-score.high { color: var(--t, #00cc96); }
	.ra-score.mid { color: #f59e0b; }
	.ra-score.low { color: #ef4444; }
	.ra-trigger {
		width: 100%; padding: 0.65rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px; color: var(--t, #00cc96);
		font-size: 0.8rem; cursor: pointer;
	}
	.ra-trigger:hover { background: rgba(0, 204, 150, 0.15); }
	.ra-loading {
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
	.ra-error {
		padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}
	.ra-questions {
		display: flex; flex-direction: column; gap: 0.75rem;
	}
	.ra-question {
		background: rgba(0, 0, 0, 0.12); border-left: 3px solid;
		border-radius: 0 8px 8px 0; padding: 0.75rem 1rem;
	}
	.rq-top {
		display: flex; align-items: center; gap: 0.4rem;
		margin-bottom: 0.4rem;
	}
	.rq-icon { font-size: 0.85rem; }
	.rq-type {
		font-size: 0.6rem; text-transform: uppercase;
		font-weight: 700; letter-spacing: 0.05em;
	}
	.rq-text {
		margin: 0; font-size: 0.85rem; color: var(--text, #e2e8f0);
		line-height: 1.5; font-weight: 500;
	}
	.rq-why {
		margin: 0.3rem 0 0.5rem; font-size: 0.72rem;
		color: var(--text-muted, #94a3b8); line-height: 1.4;
	}
	.rq-answer {
		display: flex; gap: 0.4rem;
	}
	.ans-btn {
		padding: 0.25rem 0.6rem; background: rgba(0, 204, 150, 0.06);
		border: 1px solid rgba(0, 204, 150, 0.12); border-radius: 4px;
		font-size: 0.7rem; color: var(--text-muted, #94a3b8);
		cursor: pointer; transition: all 0.15s;
	}
	.ans-btn:hover { background: rgba(0, 204, 150, 0.12); }
	.ans-btn.active {
		background: rgba(0, 204, 150, 0.15);
		border-color: var(--t, #00cc96);
		color: var(--t, #00cc96); font-weight: 600;
	}
	.ans-btn.no.active {
		background: rgba(239, 68, 68, 0.1);
		border-color: #ef4444; color: #f87171;
	}
	.ans-btn.unsure.active {
		background: rgba(245, 158, 11, 0.1);
		border-color: #f59e0b; color: #fbbf24;
	}
	.ra-rerun {
		margin-top: 0.75rem; padding: 0.3rem 0.6rem;
		background: none; border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 4px; color: var(--text-muted, #64748b);
		font-size: 0.7rem; cursor: pointer;
	}
	.ra-rerun:hover { color: var(--t, #00cc96); }
</style>
