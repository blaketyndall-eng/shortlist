<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	interface NegotiationEntry {
		id: string;
		vendor: string;
		date: string;
		type: 'call' | 'email' | 'meeting' | 'proposal' | 'contract' | 'note';
		summary: string;
		concessions: string[];
		openItems: string[];
		nextStep: string;
		confidence: number; // 1-10
	}

	let entries = $state<NegotiationEntry[]>([]);
	let selectedVendor = $state<string>('all');
	let showAdd = $state(false);
	let aiLoading = $state(false);
	let coachResult = $state<Record<string, unknown> | null>(null);

	let newEntry = $state<Partial<NegotiationEntry>>({
		vendor: '', date: new Date().toISOString().split('T')[0],
		type: 'call', summary: '', concessions: [], openItems: [], nextStep: '', confidence: 5
	});
	let newConcession = $state('');
	let newOpenItem = $state('');

	$effect(() => { loadEntries(); });

	async function loadEntries() {
		try {
			const res = await fetch(`/api/projects/${projectId}/negotiations`);
			if (res.ok) {
				const data = await res.json();
				entries = data.entries ?? [];
			}
		} catch { /* */ }
	}

	function addConcession() {
		if (!newConcession.trim()) return;
		newEntry.concessions = [...(newEntry.concessions ?? []), newConcession.trim()];
		newConcession = '';
	}

	function addOpenItem() {
		if (!newOpenItem.trim()) return;
		newEntry.openItems = [...(newEntry.openItems ?? []), newOpenItem.trim()];
		newOpenItem = '';
	}

	async function saveEntry() {
		if (!newEntry.vendor || !newEntry.summary) return;
		const entry: NegotiationEntry = {
			id: crypto.randomUUID(),
			vendor: newEntry.vendor!,
			date: newEntry.date!,
			type: newEntry.type as NegotiationEntry['type'],
			summary: newEntry.summary!,
			concessions: newEntry.concessions ?? [],
			openItems: newEntry.openItems ?? [],
			nextStep: newEntry.nextStep ?? '',
			confidence: newEntry.confidence ?? 5
		};
		entries = [...entries, entry];
		await saveAll();
		newEntry = {
			vendor: '', date: new Date().toISOString().split('T')[0],
			type: 'call', summary: '', concessions: [], openItems: [], nextStep: '', confidence: 5
		};
		showAdd = false;
	}

	async function removeEntry(id: string) {
		entries = entries.filter((e) => e.id !== id);
		await saveAll();
	}

	async function saveAll() {
		await fetch(`/api/projects/${projectId}/negotiations`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entries })
		});
	}

	async function getCoaching(vendorName: string) {
		aiLoading = true;
		coachResult = null;
		try {
			const proj = projectStore.currentProject;
			const state = (proj?.state as Record<string, any>) ?? {};
			const vendorEntries = entries.filter((e) => e.vendor === vendorName);
			const log = vendorEntries.map((e) =>
				`[${e.date}] ${e.type}: ${e.summary}${e.concessions.length ? ` | Concessions: ${e.concessions.join('; ')}` : ''}${e.openItems.length ? ` | Open: ${e.openItems.join('; ')}` : ''}`
			).join('\n');

			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'negotiation_coach',
					depth: 'standard',
					projectId,
					context: {
						vendor: vendorName,
						category: state.category ?? '',
						problem: state.problem ?? '',
						teamSize: state.teamSize ?? '',
						budget: state.budget ?? '',
						year1Cost: '',
						negotiationLog: log
					}
				})
			});
			if (res.ok) {
				const data = await res.json();
				coachResult = data.result as Record<string, unknown>;
			}
		} catch { /* */ }
		finally { aiLoading = false; }
	}

	let vendorNames = $derived([...new Set(entries.map((e) => e.vendor))]);
	let filteredEntries = $derived(
		selectedVendor === 'all' ? entries : entries.filter((e) => e.vendor === selectedVendor)
	);

	const typeIcon: Record<string, string> = {
		call: '📞', email: '✉', meeting: '🤝', proposal: '📄', contract: '📋', note: '📝'
	};

	function confColor(c: number): string {
		if (c >= 7) return '#00cc96';
		if (c >= 4) return '#f59e0b';
		return '#ef4444';
	}
</script>

<svelte:head>
	<title>Negotiations | Shortlist</title>
</svelte:head>

<div class="neg-page">
	<div class="neg-header">
		<div>
			<h1>Negotiation Log</h1>
			<p class="subtitle">Track every touchpoint, concession, and open item across vendor negotiations.</p>
		</div>
		<div class="header-actions">
			<button class="add-btn" onclick={() => (showAdd = !showAdd)}>+ Log Entry</button>
		</div>
	</div>

	<!-- Vendor filter -->
	<div class="filters">
		<button class="filter-chip" class:active={selectedVendor === 'all'} onclick={() => (selectedVendor = 'all')}>All</button>
		{#each vendorNames as vn}
			<button class="filter-chip" class:active={selectedVendor === vn} onclick={() => (selectedVendor = vn)}>{vn}</button>
		{/each}
		{#if selectedVendor !== 'all'}
			<button class="ai-coach-btn" disabled={aiLoading} onclick={() => getCoaching(selectedVendor)}>
				{aiLoading ? '…' : '✦ AI Coaching'}
			</button>
		{/if}
	</div>

	<!-- AI Coach results -->
	{#if coachResult}
		<div class="coach-panel">
			<h3>✦ Negotiation Coaching — {selectedVendor}</h3>
			{#if coachResult.overallAssessment}
				<p class="coach-assess">{coachResult.overallAssessment}</p>
			{/if}
			{#if coachResult.benchmarkInsight}
				<p class="coach-bench">{coachResult.benchmarkInsight}</p>
			{/if}
			{#if Array.isArray(coachResult.counterAsks)}
				<div class="coach-asks">
					<span class="asks-label">Counter-Asks:</span>
					{#each coachResult.counterAsks as ask}
						<span class="ask-chip">→ {ask}</span>
					{/each}
				</div>
			{/if}
			{#if coachResult.nextMove}
				<p class="coach-next"><strong>Next Move:</strong> {coachResult.nextMove}</p>
			{/if}
			<button class="coach-dismiss" onclick={() => (coachResult = null)}>Dismiss</button>
		</div>
	{/if}

	<!-- Add form -->
	{#if showAdd}
		<div class="add-form">
			<div class="form-row">
				<input type="text" bind:value={newEntry.vendor} placeholder="Vendor name" />
				<input type="date" bind:value={newEntry.date} />
				<select bind:value={newEntry.type}>
					<option value="call">Call</option>
					<option value="email">Email</option>
					<option value="meeting">Meeting</option>
					<option value="proposal">Proposal</option>
					<option value="contract">Contract</option>
					<option value="note">Note</option>
				</select>
			</div>
			<textarea bind:value={newEntry.summary} placeholder="Summary of the interaction…" rows="3"></textarea>
			<div class="form-row">
				<input type="text" bind:value={newConcession} placeholder="Add concession won…" onkeydown={(e) => e.key === 'Enter' && addConcession()} />
				<button class="chip-add" onclick={addConcession}>+</button>
			</div>
			{#if newEntry.concessions?.length}
				<div class="chips">{#each newEntry.concessions as c}<span class="chip green">{c}</span>{/each}</div>
			{/if}
			<div class="form-row">
				<input type="text" bind:value={newOpenItem} placeholder="Add open item…" onkeydown={(e) => e.key === 'Enter' && addOpenItem()} />
				<button class="chip-add" onclick={addOpenItem}>+</button>
			</div>
			{#if newEntry.openItems?.length}
				<div class="chips">{#each newEntry.openItems as o}<span class="chip amber">{o}</span>{/each}</div>
			{/if}
			<input type="text" bind:value={newEntry.nextStep} placeholder="Next step…" />
			<div class="form-row">
				<label class="conf-label">Confidence: <strong style="color: {confColor(newEntry.confidence ?? 5)}">{newEntry.confidence}</strong></label>
				<input type="range" bind:value={newEntry.confidence} min="1" max="10" />
				<button class="save-entry-btn" onclick={saveEntry}>Save</button>
			</div>
		</div>
	{/if}

	<!-- Entry timeline -->
	<div class="entry-list">
		{#each filteredEntries.toReversed() as entry (entry.id)}
			<div class="entry-card">
				<div class="entry-top">
					<span class="entry-icon">{typeIcon[entry.type]}</span>
					<span class="entry-vendor">{entry.vendor}</span>
					<span class="entry-type">{entry.type}</span>
					<span class="entry-date">{entry.date}</span>
					<span class="entry-conf" style="color: {confColor(entry.confidence)}" title="Confidence">{entry.confidence}/10</span>
				</div>
				<p class="entry-summary">{entry.summary}</p>
				{#if entry.concessions.length}
					<div class="entry-items">
						<span class="items-label green">Concessions:</span>
						{#each entry.concessions as c}<span class="item-chip green">{c}</span>{/each}
					</div>
				{/if}
				{#if entry.openItems.length}
					<div class="entry-items">
						<span class="items-label amber">Open:</span>
						{#each entry.openItems as o}<span class="item-chip amber">{o}</span>{/each}
					</div>
				{/if}
				{#if entry.nextStep}
					<p class="entry-next">→ {entry.nextStep}</p>
				{/if}
				<button class="entry-remove" onclick={() => removeEntry(entry.id)}>×</button>
			</div>
		{/each}
		{#if filteredEntries.length === 0}
			<div class="empty">No negotiation entries yet. Click "Log Entry" to start tracking.</div>
		{/if}
	</div>
</div>

<style>
	.neg-page { padding: 2rem 1.5rem; max-width: 900px; margin: 0 auto; }
	.neg-header {
		display: flex; justify-content: space-between; align-items: flex-start;
		margin-bottom: 1.5rem;
	}
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.add-btn {
		padding: 0.45rem 0.85rem; background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.8rem; cursor: pointer;
	}
	.filters { display: flex; gap: 0.4rem; margin-bottom: 1.25rem; align-items: center; flex-wrap: wrap; }
	.filter-chip {
		padding: 0.3rem 0.65rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px;
		color: var(--text-muted, #94a3b8); font-size: 0.78rem; cursor: pointer;
	}
	.filter-chip.active {
		background: rgba(0, 204, 150, 0.12); border-color: var(--t, #00cc96); color: var(--t, #00cc96);
	}
	.ai-coach-btn {
		margin-left: 0.5rem; padding: 0.3rem 0.65rem;
		background: rgba(0, 204, 150, 0.08); border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 6px; color: var(--t, #00cc96); font-size: 0.75rem; cursor: pointer;
	}
	.coach-panel {
		background: rgba(0, 204, 150, 0.04); border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;
	}
	.coach-panel h3 { margin: 0 0 0.5rem; font-size: 0.85rem; color: var(--t, #00cc96); }
	.coach-assess { margin: 0 0 0.5rem; font-size: 0.85rem; color: var(--text, #e2e8f0); line-height: 1.5; }
	.coach-bench { margin: 0 0 0.5rem; font-size: 0.8rem; color: var(--bl, #4a96f8); }
	.coach-asks { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.5rem; }
	.asks-label { font-size: 0.7rem; color: var(--text-muted, #94a3b8); font-weight: 600; }
	.ask-chip {
		padding: 0.2rem 0.5rem; background: rgba(0, 204, 150, 0.06);
		border-radius: 4px; font-size: 0.75rem; color: var(--t, #00cc96);
	}
	.coach-next { margin: 0; font-size: 0.82rem; color: var(--text, #e2e8f0); }
	.coach-dismiss {
		margin-top: 0.5rem; padding: 0.2rem 0.5rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px;
		color: var(--text-muted, #64748b); font-size: 0.7rem; cursor: pointer;
	}
	.add-form {
		background: rgba(0, 0, 0, 0.15); border-radius: 10px; padding: 1rem;
		display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem;
	}
	.form-row { display: flex; gap: 0.5rem; align-items: center; }
	.add-form input, .add-form textarea, .add-form select {
		flex: 1; padding: 0.45rem 0.65rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.82rem; font-family: 'Figtree', sans-serif;
	}
	.add-form input[type="range"] { accent-color: var(--t, #00cc96); }
	.chip-add {
		padding: 0.3rem 0.5rem; background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2); border-radius: 4px;
		color: var(--t, #00cc96); cursor: pointer; font-size: 0.85rem;
	}
	.chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
	.chip {
		padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.72rem;
	}
	.chip.green { background: rgba(0, 204, 150, 0.1); color: var(--t, #00cc96); }
	.chip.amber { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
	.conf-label { font-size: 0.78rem; color: var(--text-muted, #94a3b8); white-space: nowrap; }
	.save-entry-btn {
		padding: 0.4rem 0.85rem; background: var(--t, #00cc96);
		border: none; border-radius: 6px; color: #0b1017;
		font-size: 0.8rem; font-weight: 600; cursor: pointer;
	}
	.entry-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.entry-card {
		background: rgba(0, 0, 0, 0.1); border-radius: 8px;
		padding: 0.75rem 1rem; position: relative;
	}
	.entry-top {
		display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;
	}
	.entry-icon { font-size: 0.85rem; }
	.entry-vendor { font-weight: 600; color: var(--text, #e2e8f0); font-size: 0.82rem; }
	.entry-type {
		background: rgba(255, 255, 255, 0.06); padding: 0.1rem 0.35rem;
		border-radius: 3px; font-size: 0.65rem; color: var(--text-muted, #94a3b8);
		text-transform: uppercase;
	}
	.entry-date { margin-left: auto; font-size: 0.72rem; color: var(--text-muted, #64748b); }
	.entry-conf {
		font-size: 0.75rem; font-weight: 600;
		font-family: 'Playfair Display', serif;
	}
	.entry-summary {
		margin: 0 0 0.4rem; font-size: 0.82rem;
		color: var(--text, #e2e8f0); line-height: 1.5;
	}
	.entry-items { display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; margin-bottom: 0.3rem; }
	.items-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
	.items-label.green { color: var(--t, #00cc96); }
	.items-label.amber { color: #fbbf24; }
	.item-chip { padding: 0.12rem 0.4rem; border-radius: 3px; font-size: 0.72rem; }
	.item-chip.green { background: rgba(0, 204, 150, 0.08); color: var(--t, #00cc96); }
	.item-chip.amber { background: rgba(245, 158, 11, 0.08); color: #fbbf24; }
	.entry-next { margin: 0; font-size: 0.78rem; color: var(--t, #00cc96); opacity: 0.8; }
	.entry-remove {
		position: absolute; top: 0.5rem; right: 0.5rem; background: none;
		border: none; color: var(--text-muted, #64748b); font-size: 1rem;
		cursor: pointer; opacity: 0; transition: opacity 0.15s;
	}
	.entry-card:hover .entry-remove { opacity: 1; }
	.empty { padding: 2rem; text-align: center; color: var(--text-muted, #64748b); font-size: 0.85rem; }
</style>
