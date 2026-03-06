<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	interface ReferenceCheck {
		id: string;
		vendor: string;
		contactName: string;
		company: string;
		role: string;
		date: string;
		status: 'scheduled' | 'completed' | 'cancelled';
		questions: Array<{ question: string; area: string; answer: string }>;
		overallSentiment: 'positive' | 'mixed' | 'negative' | '';
		notes: string;
	}

	let references = $state<ReferenceCheck[]>([]);
	let showAdd = $state(false);
	let selectedVendor = $state('all');
	let aiLoading = $state(false);
	let aiQuestions = $state<Array<{ question: string; area: string; why: string }>>([]);

	let newRef = $state<Partial<ReferenceCheck>>({
		vendor: '', contactName: '', company: '', role: '',
		date: new Date().toISOString().split('T')[0],
		status: 'scheduled', questions: [], overallSentiment: '', notes: ''
	});

	$effect(() => { loadRefs(); });

	async function loadRefs() {
		try {
			const res = await fetch(`/api/projects/${projectId}/references`);
			if (res.ok) {
				const data = await res.json();
				references = data.references ?? [];
			}
		} catch { /* */ }
	}

	async function saveRef() {
		if (!newRef.vendor || !newRef.contactName) return;
		const ref: ReferenceCheck = {
			id: crypto.randomUUID(),
			vendor: newRef.vendor!,
			contactName: newRef.contactName!,
			company: newRef.company ?? '',
			role: newRef.role ?? '',
			date: newRef.date!,
			status: newRef.status as ReferenceCheck['status'],
			questions: aiQuestions.map((q) => ({ question: q.question, area: q.area, answer: '' })),
			overallSentiment: '',
			notes: ''
		};
		references = [...references, ref];
		await saveAll();
		newRef = { vendor: '', contactName: '', company: '', role: '', date: new Date().toISOString().split('T')[0], status: 'scheduled', questions: [], overallSentiment: '', notes: '' };
		aiQuestions = [];
		showAdd = false;
	}

	async function updateRef(id: string, updates: Partial<ReferenceCheck>) {
		references = references.map((r) => r.id === id ? { ...r, ...updates } : r);
		await saveAll();
	}

	async function removeRef(id: string) {
		references = references.filter((r) => r.id !== id);
		await saveAll();
	}

	async function saveAll() {
		await fetch(`/api/projects/${projectId}/references`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ references })
		});
	}

	async function generateQuestions(vendorName: string) {
		aiLoading = true;
		try {
			const proj = projectStore.currentProject;
			const state = (proj?.state as Record<string, any>) ?? {};
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'reference_questions',
					depth: 'quick',
					projectId,
					context: {
						vendorName,
						category: state.category ?? '',
						problem: state.problem ?? '',
						criteria: (state.criteria ?? []).map((c: any) => c.name).join(', '),
						concerns: (state.vendors ?? []).find((v: any) => v.name === vendorName)?.flags?.join(', ') ?? ''
					}
				})
			});
			if (res.ok) {
				const data = await res.json();
				aiQuestions = Array.isArray(data.result) ? data.result : [];
			}
		} catch { /* */ }
		finally { aiLoading = false; }
	}

	let vendorNames = $derived([...new Set(references.map((r) => r.vendor))]);
	let filteredRefs = $derived(
		selectedVendor === 'all' ? references : references.filter((r) => r.vendor === selectedVendor)
	);

	const sentimentColor: Record<string, string> = { positive: '#00cc96', mixed: '#f59e0b', negative: '#ef4444' };
	const sentimentIcon: Record<string, string> = { positive: '👍', mixed: '🤔', negative: '👎' };
	const statusColor: Record<string, string> = { scheduled: '#4a96f8', completed: '#00cc96', cancelled: '#64748b' };
</script>

<svelte:head>
	<title>References | Shortlist</title>
</svelte:head>

<div class="ref-page">
	<div class="ref-header">
		<div>
			<h1>Reference Checks</h1>
			<p class="subtitle">Track vendor reference calls and capture insights.</p>
		</div>
		<button class="add-btn" onclick={() => (showAdd = !showAdd)}>+ Schedule Reference</button>
	</div>

	<!-- Filters -->
	<div class="filters">
		<button class="filter-chip" class:active={selectedVendor === 'all'} onclick={() => (selectedVendor = 'all')}>All</button>
		{#each vendorNames as vn}
			<button class="filter-chip" class:active={selectedVendor === vn} onclick={() => (selectedVendor = vn)}>{vn}</button>
		{/each}
	</div>

	<!-- Add form -->
	{#if showAdd}
		<div class="add-form">
			<div class="form-row">
				<input type="text" bind:value={newRef.vendor} placeholder="Vendor" />
				<input type="text" bind:value={newRef.contactName} placeholder="Contact name" />
			</div>
			<div class="form-row">
				<input type="text" bind:value={newRef.company} placeholder="Reference company" />
				<input type="text" bind:value={newRef.role} placeholder="Role/title" />
				<input type="date" bind:value={newRef.date} />
			</div>
			{#if newRef.vendor}
				<button class="ai-q-btn" disabled={aiLoading} onclick={() => generateQuestions(newRef.vendor!)}>
					{aiLoading ? 'Generating…' : '✦ Generate Reference Questions'}
				</button>
			{/if}
			{#if aiQuestions.length > 0}
				<div class="ai-questions">
					{#each aiQuestions as q}
						<div class="aiq-row">
							<span class="aiq-area">{q.area}</span>
							<span class="aiq-text">{q.question}</span>
						</div>
					{/each}
				</div>
			{/if}
			<button class="save-btn" onclick={saveRef}>Save Reference</button>
		</div>
	{/if}

	<!-- Reference cards -->
	<div class="ref-list">
		{#each filteredRefs as ref (ref.id)}
			<div class="ref-card">
				<div class="ref-top">
					<span class="ref-vendor">{ref.vendor}</span>
					<span class="ref-contact">{ref.contactName} — {ref.company}</span>
					{#if ref.role}
						<span class="ref-role">{ref.role}</span>
					{/if}
					<span class="ref-date">{ref.date}</span>
					<span class="ref-status" style="color: {statusColor[ref.status]}">{ref.status}</span>
				</div>

				{#if ref.questions.length > 0}
					<div class="ref-questions">
						{#each ref.questions as q, qi}
							<div class="rq-item">
								<div class="rq-top">
									<span class="rq-area">{q.area}</span>
									<span class="rq-q">{q.question}</span>
								</div>
								<textarea
									value={q.answer}
									placeholder="Record answer…"
									rows="2"
									oninput={(e) => {
										ref.questions[qi].answer = (e.target as HTMLTextAreaElement).value;
									}}
									onblur={() => updateRef(ref.id, { questions: ref.questions })}
								></textarea>
							</div>
						{/each}
					</div>
				{/if}

				<div class="ref-footer">
					<div class="sentiment-btns">
						{#each ['positive', 'mixed', 'negative'] as s}
							<button
								class="sent-btn"
								class:active={ref.overallSentiment === s}
								style={ref.overallSentiment === s ? `color: ${sentimentColor[s]}` : ''}
								onclick={() => updateRef(ref.id, { overallSentiment: s as ReferenceCheck['overallSentiment'] })}
							>{sentimentIcon[s]} {s}</button>
						{/each}
					</div>
					{#if ref.status === 'scheduled'}
						<button class="complete-btn" onclick={() => updateRef(ref.id, { status: 'completed' })}>Mark Complete</button>
					{/if}
					<button class="remove-btn" onclick={() => removeRef(ref.id)}>Remove</button>
				</div>
			</div>
		{/each}
		{#if filteredRefs.length === 0}
			<div class="empty">No reference checks yet. Click "Schedule Reference" to start.</div>
		{/if}
	</div>
</div>

<style>
	.ref-page { padding: 2rem 1.5rem; max-width: 900px; margin: 0 auto; }
	.ref-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.add-btn {
		padding: 0.45rem 0.85rem; background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.8rem; cursor: pointer;
	}
	.filters { display: flex; gap: 0.4rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
	.filter-chip {
		padding: 0.3rem 0.65rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px;
		color: var(--text-muted, #94a3b8); font-size: 0.78rem; cursor: pointer;
	}
	.filter-chip.active { background: rgba(0, 204, 150, 0.12); border-color: var(--t, #00cc96); color: var(--t, #00cc96); }
	.add-form {
		background: rgba(0, 0, 0, 0.15); border-radius: 10px; padding: 1rem;
		display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem;
	}
	.form-row { display: flex; gap: 0.5rem; }
	.add-form input, .add-form textarea, .add-form select {
		flex: 1; padding: 0.45rem 0.65rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.82rem; font-family: 'Figtree', sans-serif;
	}
	.ai-q-btn {
		padding: 0.4rem 0.75rem; background: rgba(0, 204, 150, 0.08);
		border: 1px solid rgba(0, 204, 150, 0.15); border-radius: 6px;
		color: var(--t, #00cc96); font-size: 0.8rem; cursor: pointer; align-self: flex-start;
	}
	.ai-q-btn:disabled { opacity: 0.5; }
	.ai-questions { display: flex; flex-direction: column; gap: 0.3rem; }
	.aiq-row { display: flex; gap: 0.5rem; font-size: 0.78rem; padding: 0.3rem 0.5rem; background: rgba(0, 204, 150, 0.04); border-radius: 4px; }
	.aiq-area { color: var(--t, #00cc96); font-weight: 600; font-size: 0.65rem; text-transform: uppercase; min-width: 80px; }
	.aiq-text { color: var(--text, #e2e8f0); }
	.save-btn {
		padding: 0.45rem 1rem; background: var(--t, #00cc96); border: none;
		border-radius: 6px; color: #0b1017; font-size: 0.8rem; font-weight: 600;
		cursor: pointer; align-self: flex-start;
	}
	.ref-list { display: flex; flex-direction: column; gap: 0.75rem; }
	.ref-card { background: rgba(0, 0, 0, 0.1); border-radius: 10px; padding: 1rem; }
	.ref-top { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
	.ref-vendor { font-weight: 600; color: var(--text, #e2e8f0); font-size: 0.85rem; }
	.ref-contact { font-size: 0.8rem; color: var(--text-muted, #94a3b8); }
	.ref-role { font-size: 0.7rem; background: rgba(255, 255, 255, 0.06); padding: 0.1rem 0.35rem; border-radius: 3px; color: var(--text-muted, #94a3b8); }
	.ref-date { margin-left: auto; font-size: 0.72rem; color: var(--text-muted, #64748b); }
	.ref-status { font-size: 0.68rem; font-weight: 600; text-transform: uppercase; }
	.ref-questions { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
	.rq-item { background: rgba(0, 0, 0, 0.08); border-radius: 6px; padding: 0.5rem 0.65rem; }
	.rq-top { display: flex; gap: 0.5rem; margin-bottom: 0.3rem; }
	.rq-area { font-size: 0.6rem; color: var(--bl, #4a96f8); font-weight: 600; text-transform: uppercase; min-width: 80px; }
	.rq-q { font-size: 0.78rem; color: var(--text, #e2e8f0); font-weight: 500; }
	.rq-item textarea {
		width: 100%; padding: 0.35rem 0.5rem; background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px;
		color: var(--text, #e2e8f0); font-size: 0.78rem; font-family: 'Figtree', sans-serif;
		resize: vertical;
	}
	.ref-footer { display: flex; align-items: center; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.04); }
	.sentiment-btns { display: flex; gap: 0.3rem; }
	.sent-btn {
		padding: 0.2rem 0.5rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px;
		font-size: 0.7rem; color: var(--text-muted, #64748b); cursor: pointer;
	}
	.sent-btn.active { background: rgba(0, 204, 150, 0.08); border-color: currentColor; }
	.complete-btn {
		margin-left: auto; padding: 0.2rem 0.6rem; background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2); border-radius: 4px;
		color: var(--t, #00cc96); font-size: 0.72rem; cursor: pointer;
	}
	.remove-btn {
		padding: 0.2rem 0.5rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px;
		color: var(--text-muted, #64748b); font-size: 0.7rem; cursor: pointer;
	}
	.empty { padding: 2rem; text-align: center; color: var(--text-muted, #64748b); font-size: 0.85rem; }
</style>
