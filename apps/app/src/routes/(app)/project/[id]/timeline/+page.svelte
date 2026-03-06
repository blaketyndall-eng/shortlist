<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	interface Milestone {
		id: string;
		title: string;
		date: string;
		type: 'kickoff' | 'demo' | 'decision' | 'contract' | 'implementation' | 'go-live' | 'review' | 'custom';
		vendor?: string;
		status: 'upcoming' | 'in-progress' | 'completed' | 'delayed';
		notes: string;
	}

	let milestones = $state<Milestone[]>([]);
	let showAdd = $state(false);
	let newMs = $state<Partial<Milestone>>({
		title: '', date: '', type: 'custom', vendor: '', status: 'upcoming', notes: ''
	});

	$effect(() => { loadTimeline(); });

	async function loadTimeline() {
		try {
			const res = await fetch(`/api/projects/${projectId}/timeline`);
			if (res.ok) {
				const data = await res.json();
				milestones = (data.milestones ?? []).sort((a: Milestone, b: Milestone) => a.date.localeCompare(b.date));
			}
		} catch { /* */ }
	}

	async function addMilestone() {
		if (!newMs.title || !newMs.date) return;
		const ms: Milestone = {
			id: crypto.randomUUID(),
			title: newMs.title!,
			date: newMs.date!,
			type: newMs.type as Milestone['type'],
			vendor: newMs.vendor || undefined,
			status: 'upcoming',
			notes: newMs.notes ?? ''
		};
		milestones = [...milestones, ms].sort((a, b) => a.date.localeCompare(b.date));
		await saveAll();
		newMs = { title: '', date: '', type: 'custom', vendor: '', status: 'upcoming', notes: '' };
		showAdd = false;
	}

	async function cycleStatus(id: string) {
		milestones = milestones.map((m) => {
			if (m.id === id) {
				const order: Milestone['status'][] = ['upcoming', 'in-progress', 'completed', 'delayed'];
				const next = order[(order.indexOf(m.status) + 1) % order.length];
				return { ...m, status: next };
			}
			return m;
		});
		await saveAll();
	}

	async function removeMilestone(id: string) {
		milestones = milestones.filter((m) => m.id !== id);
		await saveAll();
	}

	async function saveAll() {
		await fetch(`/api/projects/${projectId}/timeline`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ milestones })
		});
	}

	const today = new Date().toISOString().split('T')[0];

	const typeIcon: Record<string, string> = {
		kickoff: '🚀', demo: '🎥', decision: '⚖️', contract: '📋',
		implementation: '🔧', 'go-live': '🎉', review: '📊', custom: '📌'
	};

	const statusColor: Record<string, string> = {
		upcoming: '#4a96f8', 'in-progress': '#f59e0b', completed: '#00cc96', delayed: '#ef4444'
	};

	let completedCount = $derived(milestones.filter((m) => m.status === 'completed').length);
	let progress = $derived(milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0);

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function isPast(dateStr: string): boolean {
		return dateStr < today;
	}
</script>

<svelte:head>
	<title>Timeline | Shortlist</title>
</svelte:head>

<div class="timeline-page">
	<div class="tl-header">
		<div>
			<h1>Project Timeline</h1>
			<p class="subtitle">Track milestones from kickoff through go-live.</p>
		</div>
		<div class="header-actions">
			<div class="progress-ring">
				<span class="prog-num">{progress}%</span>
			</div>
			<button class="add-btn" onclick={() => (showAdd = !showAdd)}>+ Add Milestone</button>
		</div>
	</div>

	<!-- Progress bar -->
	<div class="progress-bar">
		<div class="prog-fill" style="width: {progress}%"></div>
		<span class="prog-label">{completedCount} of {milestones.length} milestones complete</span>
	</div>

	<!-- Add form -->
	{#if showAdd}
		<div class="add-form">
			<div class="form-row">
				<input type="text" bind:value={newMs.title} placeholder="Milestone title" />
				<input type="date" bind:value={newMs.date} />
				<select bind:value={newMs.type}>
					<option value="kickoff">Kickoff</option>
					<option value="demo">Demo</option>
					<option value="decision">Decision</option>
					<option value="contract">Contract</option>
					<option value="implementation">Implementation</option>
					<option value="go-live">Go-Live</option>
					<option value="review">Review</option>
					<option value="custom">Custom</option>
				</select>
			</div>
			<div class="form-row">
				<input type="text" bind:value={newMs.vendor} placeholder="Vendor (optional)" />
				<textarea bind:value={newMs.notes} placeholder="Notes…" rows="1"></textarea>
				<button class="save-btn" onclick={addMilestone}>Add</button>
			</div>
		</div>
	{/if}

	<!-- Timeline visualization -->
	<div class="timeline">
		{#each milestones as ms, i (ms.id)}
			{@const past = isPast(ms.date)}
			<div class="tl-item" class:past class:completed={ms.status === 'completed'} class:delayed={ms.status === 'delayed'}>
				<div class="tl-line">
					<div class="tl-dot" style="border-color: {statusColor[ms.status]}">
						{#if ms.status === 'completed'}✓{/if}
					</div>
					{#if i < milestones.length - 1}
						<div class="tl-connector"></div>
					{/if}
				</div>
				<div class="tl-content">
					<div class="tl-top">
						<span class="tl-icon">{typeIcon[ms.type]}</span>
						<span class="tl-title">{ms.title}</span>
						{#if ms.vendor}
							<span class="tl-vendor">{ms.vendor}</span>
						{/if}
						<button
							class="tl-status"
							style="color: {statusColor[ms.status]}"
							onclick={() => cycleStatus(ms.id)}
							title="Click to change status"
						>{ms.status}</button>
					</div>
					<div class="tl-meta">
						<span class="tl-date" class:overdue={past && ms.status !== 'completed'}>{formatDate(ms.date)}</span>
						<span class="tl-type">{ms.type}</span>
					</div>
					{#if ms.notes}
						<p class="tl-notes">{ms.notes}</p>
					{/if}
					<button class="tl-remove" onclick={() => removeMilestone(ms.id)}>×</button>
				</div>
			</div>
		{/each}
		{#if milestones.length === 0}
			<div class="empty">No milestones yet. Add your first milestone to start tracking the project timeline.</div>
		{/if}
	</div>
</div>

<style>
	.timeline-page { padding: 2rem 1.5rem; max-width: 800px; margin: 0 auto; }
	.tl-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.header-actions { display: flex; align-items: center; gap: 0.75rem; }
	.progress-ring {
		width: 40px; height: 40px; border-radius: 50%;
		background: conic-gradient(var(--t, #00cc96) var(--prog, 0%), rgba(255,255,255,0.06) 0%);
		display: flex; align-items: center; justify-content: center;
	}
	.prog-num {
		font-size: 0.6rem; font-weight: 700; color: var(--text, #e2e8f0);
		background: var(--bg, #0b1017); width: 32px; height: 32px;
		border-radius: 50%; display: flex; align-items: center; justify-content: center;
	}
	.add-btn {
		padding: 0.45rem 0.85rem; background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.8rem; cursor: pointer;
	}
	.progress-bar {
		height: 6px; background: rgba(255, 255, 255, 0.06); border-radius: 3px;
		overflow: hidden; margin-bottom: 1.5rem; position: relative;
	}
	.prog-fill { height: 100%; background: var(--t, #00cc96); border-radius: 3px; transition: width 0.4s; }
	.prog-label {
		position: absolute; right: 0; top: 10px; font-size: 0.7rem;
		color: var(--text-muted, #64748b);
	}
	.add-form {
		background: rgba(0, 0, 0, 0.15); border-radius: 10px; padding: 1rem;
		display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;
	}
	.form-row { display: flex; gap: 0.5rem; }
	.add-form input, .add-form textarea, .add-form select {
		flex: 1; padding: 0.45rem 0.65rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.82rem; font-family: 'Figtree', sans-serif;
	}
	.save-btn {
		padding: 0.4rem 0.85rem; background: var(--t, #00cc96); border: none;
		border-radius: 6px; color: #0b1017; font-size: 0.8rem; font-weight: 600; cursor: pointer;
	}
	.timeline { padding-left: 1rem; }
	.tl-item { display: flex; gap: 1rem; min-height: 60px; }
	.tl-line { display: flex; flex-direction: column; align-items: center; width: 20px; }
	.tl-dot {
		width: 20px; height: 20px; border-radius: 50%; background: var(--bg, #0b1017);
		border: 2px solid; display: flex; align-items: center; justify-content: center;
		font-size: 0.6rem; color: var(--t, #00cc96); flex-shrink: 0;
	}
	.tl-connector { flex: 1; width: 2px; background: rgba(255, 255, 255, 0.06); margin: 4px 0; }
	.tl-content {
		flex: 1; padding-bottom: 1rem; position: relative;
	}
	.tl-top { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
	.tl-icon { font-size: 0.85rem; }
	.tl-title { font-weight: 600; color: var(--text, #e2e8f0); font-size: 0.85rem; }
	.tl-vendor {
		background: rgba(255, 255, 255, 0.06); padding: 0.1rem 0.35rem;
		border-radius: 3px; font-size: 0.68rem; color: var(--text-muted, #94a3b8);
	}
	.tl-status {
		margin-left: auto; padding: 0.1rem 0.4rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 3px;
		font-size: 0.6rem; text-transform: uppercase; font-weight: 700;
		letter-spacing: 0.04em; cursor: pointer;
	}
	.tl-meta { display: flex; gap: 0.5rem; margin-top: 0.2rem; }
	.tl-date { font-size: 0.75rem; color: var(--text-muted, #94a3b8); }
	.tl-date.overdue { color: #ef4444; }
	.tl-type {
		font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted, #64748b);
		letter-spacing: 0.04em;
	}
	.tl-notes { margin: 0.3rem 0 0; font-size: 0.78rem; color: var(--text-muted, #94a3b8); }
	.tl-remove {
		position: absolute; top: 0; right: 0; background: none;
		border: none; color: var(--text-muted, #64748b); font-size: 0.9rem;
		cursor: pointer; opacity: 0; transition: opacity 0.15s;
	}
	.tl-content:hover .tl-remove { opacity: 1; }
	.tl-item.completed .tl-title { opacity: 0.6; }
	.tl-item.delayed .tl-title { color: #f87171; }
	.empty { padding: 2rem; text-align: center; color: var(--text-muted, #64748b); font-size: 0.85rem; }
</style>
