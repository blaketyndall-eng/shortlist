<script lang="ts">
	/**
	 * SuggestPanel — Generic AI suggestions panel
	 * Used for criteria suggestions, vendor suggestions, priority suggestions, etc.
	 * Shows results as selectable chips or cards.
	 */

	interface Suggestion {
		text: string;
		category?: string;
		description?: string;
		weight?: number;
	}

	interface Props {
		title: string;
		engine: string;
		projectId: string;
		context?: Record<string, unknown>;
		mode?: 'chips' | 'cards';
		multiSelect?: boolean;
		maxSelections?: number;
		onselect?: (selected: Suggestion[]) => void;
	}

	let {
		title,
		engine,
		projectId,
		context = {},
		mode = 'chips',
		multiSelect = true,
		maxSelections = 10,
		onselect
	}: Props = $props();

	let loading = $state(false);
	let suggestions = $state<Suggestion[]>([]);
	let selected = $state<Set<number>>(new Set());
	let error = $state('');
	let hasRun = $state(false);

	async function getSuggestions() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ engine, depth: 'quick', projectId, context })
			});
			if (!res.ok) throw new Error('Suggestion failed');
			const data = await res.json();

			// Handle various result shapes
			const raw = data.result;
			if (Array.isArray(raw)) {
				suggestions = raw.map((item: any) =>
					typeof item === 'string'
						? { text: item }
						: { text: item.name ?? item.text ?? String(item), ...item }
				);
			} else if (raw?.criteria) {
				suggestions = raw.criteria.map((c: any) => ({
					text: c.name,
					category: c.category,
					description: c.description,
					weight: c.weight
				}));
			} else if (typeof raw === 'string') {
				suggestions = raw.split(',').map((s: string) => ({ text: s.trim() })).filter((s: Suggestion) => s.text);
			} else {
				suggestions = [];
			}

			hasRun = true;
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function toggleSelection(idx: number) {
		const next = new Set(selected);
		if (next.has(idx)) {
			next.delete(idx);
		} else if (multiSelect) {
			if (next.size < maxSelections) next.add(idx);
		} else {
			next.clear();
			next.add(idx);
		}
		selected = next;
		onselect?.(Array.from(next).map((i) => suggestions[i]));
	}

	function selectAll() {
		selected = new Set(suggestions.map((_, i) => i));
		onselect?.(suggestions);
	}
</script>

<div class="suggest-panel">
	<div class="sp-header">
		<span class="sp-badge">✦ {title}</span>
		{#if hasRun && suggestions.length > 0 && multiSelect}
			<button class="sp-select-all" onclick={selectAll}>Select All</button>
		{/if}
	</div>

	{#if !hasRun && !loading}
		<button class="sp-trigger" onclick={getSuggestions}>
			Get AI Suggestions
		</button>
	{/if}

	{#if loading}
		<div class="sp-loading">
			<div class="spinner"></div>
			<span>Generating suggestions…</span>
		</div>
	{/if}

	{#if error}
		<div class="sp-error">{error}</div>
	{/if}

	{#if hasRun && suggestions.length > 0}
		{#if mode === 'chips'}
			<div class="sp-chips">
				{#each suggestions as sug, i}
					<button
						class="sp-chip"
						class:selected={selected.has(i)}
						onclick={() => toggleSelection(i)}
					>
						{sug.text}
						{#if sug.category}
							<span class="chip-cat">· {sug.category}</span>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="sp-cards">
				{#each suggestions as sug, i}
					<button
						class="sp-card"
						class:selected={selected.has(i)}
						onclick={() => toggleSelection(i)}
					>
						<span class="card-text">{sug.text}</span>
						{#if sug.description}
							<span class="card-desc">{sug.description}</span>
						{/if}
						{#if sug.category || sug.weight}
							<div class="card-meta">
								{#if sug.category}<span class="card-cat">{sug.category}</span>{/if}
								{#if sug.weight}<span class="card-weight">Weight: {sug.weight}</span>{/if}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		{#if selected.size > 0}
			<div class="sp-selected-count">
				{selected.size} selected
			</div>
		{/if}

		<button class="sp-rerun" onclick={getSuggestions}>↻ New suggestions</button>
	{/if}

	{#if hasRun && suggestions.length === 0}
		<div class="sp-empty">No suggestions available. Try adjusting your inputs.</div>
	{/if}
</div>

<style>
	.suggest-panel {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: 12px; padding: 1.25rem;
	}
	.sp-header {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 1rem;
	}
	.sp-badge { font-size: 0.8rem; font-weight: 600; color: var(--t, #00cc96); }
	.sp-select-all {
		padding: 0.2rem 0.5rem; background: none;
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 4px; color: var(--t, #00cc96);
		font-size: 0.65rem; cursor: pointer;
	}
	.sp-trigger {
		width: 100%; padding: 0.65rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 8px; color: var(--t, #00cc96);
		font-size: 0.8rem; cursor: pointer;
	}
	.sp-trigger:hover { background: rgba(0, 204, 150, 0.15); }
	.sp-loading {
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
	.sp-error {
		padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}
	.sp-chips {
		display: flex; flex-wrap: wrap; gap: 0.4rem;
	}
	.sp-chip {
		padding: 0.35rem 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px; color: var(--text, #e2e8f0);
		font-size: 0.78rem; cursor: pointer; transition: all 0.15s;
	}
	.sp-chip:hover { border-color: rgba(0, 204, 150, 0.3); }
	.sp-chip.selected {
		background: rgba(0, 204, 150, 0.12);
		border-color: var(--t, #00cc96);
		color: var(--t, #00cc96); font-weight: 500;
	}
	.chip-cat { font-size: 0.65rem; color: var(--text-muted, #64748b); }
	.sp-cards {
		display: flex; flex-direction: column; gap: 0.4rem;
	}
	.sp-card {
		display: flex; flex-direction: column;
		padding: 0.6rem 0.85rem; text-align: left;
		background: rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 8px; cursor: pointer; transition: all 0.15s;
	}
	.sp-card:hover { border-color: rgba(0, 204, 150, 0.2); }
	.sp-card.selected {
		background: rgba(0, 204, 150, 0.08);
		border-color: var(--t, #00cc96);
	}
	.card-text { font-size: 0.82rem; color: var(--text, #e2e8f0); font-weight: 500; }
	.card-desc {
		font-size: 0.72rem; color: var(--text-muted, #94a3b8);
		margin-top: 0.2rem; line-height: 1.4;
	}
	.card-meta {
		display: flex; gap: 0.75rem; margin-top: 0.3rem;
	}
	.card-cat, .card-weight {
		font-size: 0.6rem; text-transform: uppercase;
		color: var(--text-muted, #64748b); font-weight: 600; letter-spacing: 0.04em;
	}
	.sp-selected-count {
		margin-top: 0.5rem; font-size: 0.72rem;
		color: var(--t, #00cc96); font-weight: 500;
	}
	.sp-rerun {
		margin-top: 0.5rem; padding: 0.3rem 0.6rem;
		background: none; border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 4px; color: var(--text-muted, #64748b);
		font-size: 0.7rem; cursor: pointer;
	}
	.sp-rerun:hover { color: var(--t, #00cc96); }
	.sp-empty {
		padding: 0.75rem; text-align: center;
		color: var(--text-muted, #64748b); font-size: 0.8rem;
	}
</style>
