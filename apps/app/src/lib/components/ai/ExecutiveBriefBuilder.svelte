<script lang="ts">
	interface Props {
		projectId: string;
		problem?: string;
		success?: string;
		budget?: string;
		deadline?: string;
		teamSize?: string;
		vendorRankings?: string;
		winner?: Record<string, unknown>;
		runner?: Record<string, unknown>;
		onresult?: (text: string) => void;
	}

	let {
		projectId, problem = '', success = '', budget = '', deadline = '',
		teamSize = '', vendorRankings = '', winner, runner,
		onresult
	}: Props = $props();

	let loading = $state(false);
	let briefText = $state('');
	let error = $state('');

	async function generate() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'executive_brief',
					depth: 'deep',
					projectId,
					context: { problem, success, budget, deadline, teamSize, vendorRankings, winner, runner }
				})
			});
			if (!res.ok) throw new Error('Brief generation failed');
			const data = await res.json();
			briefText = typeof data.result === 'string'
				? data.result
				: data.result?.text ?? JSON.stringify(data.result);
			onresult?.(briefText);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function copyBrief() {
		navigator.clipboard.writeText(briefText);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	let copied = $state(false);
</script>

<div class="exec-brief">
	<div class="eb-header">
		<span class="eb-badge">✦ Executive Brief</span>
		<span class="eb-note">CFO-ready recommendation memo</span>
	</div>

	{#if !briefText && !loading}
		<button class="eb-trigger" onclick={generate}>
			Generate Executive Brief
		</button>
	{/if}

	{#if loading}
		<div class="eb-loading">
			<div class="spinner"></div>
			<span>Writing executive recommendation…</span>
		</div>
	{/if}

	{#if error}
		<div class="eb-error">{error}</div>
	{/if}

	{#if briefText}
		<div class="eb-content">
			<div class="eb-text">
				{#each briefText.split('\n\n') as paragraph}
					<p>{paragraph}</p>
				{/each}
			</div>
			<div class="eb-actions">
				<button class="eb-copy" onclick={copyBrief}>
					{copied ? '✓ Copied' : '📋 Copy to Clipboard'}
				</button>
				<button class="eb-rerun" onclick={generate}>↻ Regenerate</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.exec-brief {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px; padding: 1.25rem;
	}
	.eb-header {
		display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;
	}
	.eb-badge { font-size: 0.8rem; font-weight: 600; color: var(--t, #00cc96); }
	.eb-note { font-size: 0.72rem; color: var(--text-muted, #64748b); }
	.eb-trigger {
		width: 100%; padding: 0.75rem;
		background: linear-gradient(135deg, rgba(0, 204, 150, 0.1), rgba(74, 150, 248, 0.1));
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px; color: var(--t, #00cc96);
		font-size: 0.85rem; font-weight: 500; cursor: pointer;
	}
	.eb-trigger:hover {
		background: linear-gradient(135deg, rgba(0, 204, 150, 0.18), rgba(74, 150, 248, 0.18));
	}
	.eb-loading {
		display: flex; align-items: center; gap: 0.75rem;
		padding: 1rem; color: var(--text-muted, #94a3b8); font-size: 0.85rem;
	}
	.spinner {
		width: 18px; height: 18px;
		border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: var(--t, #00cc96); border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.eb-error {
		padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}
	.eb-content {
		background: rgba(0, 0, 0, 0.15); border-radius: 10px;
		padding: 1.5rem; border-left: 3px solid var(--t, #00cc96);
	}
	.eb-text p {
		margin: 0 0 1rem; font-size: 0.88rem;
		color: var(--text, #e2e8f0); line-height: 1.7;
		font-family: 'Figtree', sans-serif;
	}
	.eb-text p:last-child { margin-bottom: 0; }
	.eb-actions {
		display: flex; gap: 0.5rem; margin-top: 1rem;
		padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.eb-copy {
		padding: 0.4rem 0.75rem;
		background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2);
		border-radius: 6px; color: var(--t, #00cc96);
		font-size: 0.75rem; cursor: pointer;
	}
	.eb-copy:hover { background: rgba(0, 204, 150, 0.2); }
	.eb-rerun {
		padding: 0.4rem 0.75rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 6px; color: var(--text-muted, #64748b);
		font-size: 0.75rem; cursor: pointer;
	}
	.eb-rerun:hover { color: var(--t, #00cc96); }
</style>
