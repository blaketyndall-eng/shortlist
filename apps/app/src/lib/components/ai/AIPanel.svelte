<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		engine: string;
		projectId: string;
		context?: Record<string, unknown>;
		depth?: 'quick' | 'standard' | 'deep';
		autoRun?: boolean;
		onresult?: (data: unknown) => void;
	}

	let {
		title,
		description = '',
		engine,
		projectId,
		context = {},
		depth = 'standard',
		autoRun = false,
		onresult
	}: Props = $props();

	let loading = $state(false);
	let result = $state<unknown>(null);
	let error = $state('');
	let tokensUsed = $state({ input: 0, output: 0 });
	let confidence = $state(0);
	let model = $state('');
	let hasRun = $state(false);

	async function runEngine() {
		loading = true;
		error = '';
		result = null;

		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ engine, depth, context, projectId })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(err.message ?? `AI error: ${res.status}`);
			}

			const data = await res.json();
			result = data.result ?? data.data;
			tokensUsed = data.tokensUsed ?? { input: 0, output: 0 };
			confidence = data.confidence ?? 0;
			model = data.model ?? '';
			hasRun = true;

			onresult?.(result);
		} catch (e: any) {
			error = e.message ?? 'AI analysis failed';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (autoRun) runEngine();
	});
</script>

<div class="ai-panel">
	<div class="ai-header">
		<div class="ai-badge">
			<span class="ai-icon">✦</span>
			<span>AI</span>
		</div>
		<div class="ai-title-block">
			<h3>{title}</h3>
			{#if description}
				<p class="ai-desc">{description}</p>
			{/if}
		</div>
		{#if hasRun && confidence > 0}
			<div class="ai-confidence" title="AI confidence: {confidence}%">
				<span class="conf-bar" style="width: {confidence}%"></span>
				<span class="conf-label">{confidence}%</span>
			</div>
		{/if}
	</div>

	{#if !hasRun && !loading}
		<button class="ai-trigger" onclick={runEngine}>
			<span class="sparkle">✦</span> Run Analysis
		</button>
	{/if}

	{#if loading}
		<div class="ai-loading">
			<div class="ai-spinner"></div>
			<span>Analyzing…</span>
		</div>
	{/if}

	{#if error}
		<div class="ai-error">
			<span>⚠</span> {error}
			<button class="retry-btn" onclick={runEngine}>Retry</button>
		</div>
	{/if}

	{#if result && !loading}
		<div class="ai-result">
			{@render children?.()}
		</div>
		{#if tokensUsed.input > 0}
			<div class="ai-meta">
				<span title="Model used">{model}</span>
				<span title="Tokens used">{tokensUsed.input + tokensUsed.output} tokens</span>
			</div>
		{/if}
		<button class="ai-rerun" onclick={runEngine}>
			<span>↻</span> Re-run
		</button>
	{/if}
</div>

{#snippet children()}
	<!-- Default: render JSON result -->
	{#if typeof result === 'string'}
		<p class="ai-text">{result}</p>
	{:else if result}
		<pre class="ai-json">{JSON.stringify(result, null, 2)}</pre>
	{/if}
{/snippet}

<style>
	.ai-panel {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 12px;
		padding: 1.25rem;
	}
	.ai-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.ai-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: rgba(0, 204, 150, 0.12);
		color: var(--t, #00cc96);
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}
	.ai-icon {
		font-size: 0.8rem;
	}
	.ai-title-block {
		flex: 1;
	}
	.ai-title-block h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text, #e2e8f0);
	}
	.ai-desc {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: var(--text-muted, #94a3b8);
	}
	.ai-confidence {
		position: relative;
		width: 60px;
		height: 6px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 3px;
		overflow: hidden;
		margin-top: 0.3rem;
	}
	.conf-bar {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		background: var(--t, #00cc96);
		border-radius: 3px;
		transition: width 0.5s ease;
	}
	.conf-label {
		position: absolute;
		right: -2.5rem;
		top: -0.3rem;
		font-size: 0.65rem;
		color: var(--text-muted, #94a3b8);
	}
	.ai-trigger {
		width: 100%;
		padding: 0.75rem;
		background: rgba(0, 204, 150, 0.1);
		border: 1px dashed rgba(0, 204, 150, 0.3);
		border-radius: 8px;
		color: var(--t, #00cc96);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}
	.ai-trigger:hover {
		background: rgba(0, 204, 150, 0.18);
		border-color: rgba(0, 204, 150, 0.5);
	}
	.sparkle {
		margin-right: 0.3rem;
	}
	.ai-loading {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		color: var(--text-muted, #94a3b8);
		font-size: 0.85rem;
	}
	.ai-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: var(--t, #00cc96);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.ai-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 8px;
		color: #f87171;
		font-size: 0.8rem;
	}
	.retry-btn {
		margin-left: auto;
		padding: 0.3rem 0.6rem;
		background: rgba(239, 68, 68, 0.15);
		border: none;
		border-radius: 4px;
		color: #f87171;
		font-size: 0.75rem;
		cursor: pointer;
	}
	.ai-result {
		margin-top: 0.5rem;
	}
	.ai-text {
		color: var(--text, #e2e8f0);
		font-size: 0.85rem;
		line-height: 1.6;
		margin: 0;
	}
	.ai-json {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
		padding: 0.75rem;
		font-size: 0.75rem;
		color: var(--text-muted, #94a3b8);
		overflow-x: auto;
		margin: 0;
	}
	.ai-meta {
		display: flex;
		gap: 1rem;
		margin-top: 0.75rem;
		font-size: 0.65rem;
		color: var(--text-muted, #64748b);
	}
	.ai-rerun {
		margin-top: 0.5rem;
		padding: 0.3rem 0.6rem;
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		color: var(--text-muted, #94a3b8);
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.ai-rerun:hover {
		border-color: rgba(0, 204, 150, 0.3);
		color: var(--t, #00cc96);
	}
</style>
