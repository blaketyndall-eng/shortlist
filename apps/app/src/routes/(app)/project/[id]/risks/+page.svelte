<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	interface Risk {
		id: string;
		vendor: string | null;
		severity: 'high' | 'medium' | 'low';
		title: string;
		detail: string;
		action: string;
		source: 'ai' | 'manual' | 'demo' | 'negotiation';
		status: 'open' | 'mitigated' | 'accepted';
		createdAt: string;
	}

	let risks = $state<Risk[]>([]);
	let aiLoading = $state(false);
	let showAdd = $state(false);
	let filterSeverity = $state<string>('all');
	let filterStatus = $state<string>('all');

	// New risk form
	let newRisk = $state<Partial<Risk>>({
		vendor: null, severity: 'medium', title: '', detail: '', action: '', source: 'manual', status: 'open'
	});

	// Load existing risks
	$effect(() => {
		loadRisks();
	});

	async function loadRisks() {
		try {
			const res = await fetch(`/api/projects/${projectId}/risks`);
			if (res.ok) {
				const data = await res.json();
				risks = data.risks ?? [];
			}
		} catch { /* */ }
	}

	async function addRisk() {
		if (!newRisk.title) return;
		const risk: Risk = {
			id: crypto.randomUUID(),
			vendor: newRisk.vendor || null,
			severity: newRisk.severity as Risk['severity'],
			title: newRisk.title!,
			detail: newRisk.detail || '',
			action: newRisk.action || '',
			source: 'manual',
			status: 'open',
			createdAt: new Date().toISOString()
		};
		risks = [...risks, risk];
		await saveRisks();
		newRisk = { vendor: null, severity: 'medium', title: '', detail: '', action: '', source: 'manual', status: 'open' };
		showAdd = false;
	}

	async function toggleStatus(id: string) {
		risks = risks.map((r) => {
			if (r.id === id) {
				const next = r.status === 'open' ? 'mitigated' : r.status === 'mitigated' ? 'accepted' : 'open';
				return { ...r, status: next };
			}
			return r;
		});
		await saveRisks();
	}

	async function removeRisk(id: string) {
		risks = risks.filter((r) => r.id !== id);
		await saveRisks();
	}

	async function saveRisks() {
		await fetch(`/api/projects/${projectId}/risks`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ risks })
		});
	}

	// AI: Generate risks from evaluation data
	async function aiGenerateRisks() {
		aiLoading = true;
		try {
			const proj = projectStore.currentProject;
			const state = (proj?.state as Record<string, any>) ?? {};
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'risk_register',
					depth: 'standard',
					projectId,
					context: {
						feedbackSummary: JSON.stringify(state.demoFeedback ?? {}),
						negotiationNotes: JSON.stringify(state.negotiationLog ?? []),
						materialNotes: JSON.stringify(state.materials ?? []),
						evaluationContext: `${state.name ?? 'Evaluation'}, ${(state.vendors ?? []).length} vendors, category: ${state.category ?? 'software'}`
					}
				})
			});
			if (res.ok) {
				const data = await res.json();
				const aiRisks = Array.isArray(data.result) ? data.result : [];
				const newRisks = aiRisks.map((r: any) => ({
					id: crypto.randomUUID(),
					vendor: r.vendor || null,
					severity: r.severity || 'medium',
					title: r.title || 'Untitled Risk',
					detail: r.detail || '',
					action: r.action || '',
					source: 'ai' as const,
					status: 'open' as const,
					createdAt: new Date().toISOString()
				}));
				risks = [...risks, ...newRisks];
				await saveRisks();
			}
		} catch { /* */ }
		finally { aiLoading = false; }
	}

	let filteredRisks = $derived(
		risks.filter((r) => {
			if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
			if (filterStatus !== 'all' && r.status !== filterStatus) return false;
			return true;
		})
	);

	const sevColor: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
	const sevIcon: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' };
	const statusIcon: Record<string, string> = { open: '⚠', mitigated: '✓', accepted: '~' };
	const statusColor: Record<string, string> = { open: '#f59e0b', mitigated: '#00cc96', accepted: '#64748b' };

	let summaryHigh = $derived(risks.filter((r) => r.severity === 'high' && r.status === 'open').length);
	let summaryMedium = $derived(risks.filter((r) => r.severity === 'medium' && r.status === 'open').length);
	let summaryLow = $derived(risks.filter((r) => r.severity === 'low' && r.status === 'open').length);
</script>

<svelte:head>
	<title>Risk Register | Shortlist</title>
</svelte:head>

<div class="risks-page">
	<div class="risks-header">
		<div>
			<h1>Risk Register</h1>
			<p class="subtitle">Track and mitigate purchase risks across vendors.</p>
		</div>
		<div class="header-actions">
			<button class="ai-btn" disabled={aiLoading} onclick={aiGenerateRisks}>
				{aiLoading ? 'Analyzing…' : '✦ AI Detect Risks'}
			</button>
			<button class="add-btn" onclick={() => (showAdd = !showAdd)}>+ Add Risk</button>
		</div>
	</div>

	<!-- Summary -->
	<div class="risk-summary">
		<div class="sum-card high">
			<span class="sum-num">{summaryHigh}</span>
			<span class="sum-label">High</span>
		</div>
		<div class="sum-card medium">
			<span class="sum-num">{summaryMedium}</span>
			<span class="sum-label">Medium</span>
		</div>
		<div class="sum-card low">
			<span class="sum-num">{summaryLow}</span>
			<span class="sum-label">Low</span>
		</div>
		<div class="sum-card mitigated">
			<span class="sum-num">{risks.filter((r) => r.status !== 'open').length}</span>
			<span class="sum-label">Resolved</span>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters">
		<select bind:value={filterSeverity}>
			<option value="all">All Severities</option>
			<option value="high">High</option>
			<option value="medium">Medium</option>
			<option value="low">Low</option>
		</select>
		<select bind:value={filterStatus}>
			<option value="all">All Statuses</option>
			<option value="open">Open</option>
			<option value="mitigated">Mitigated</option>
			<option value="accepted">Accepted</option>
		</select>
	</div>

	<!-- Add form -->
	{#if showAdd}
		<div class="add-form">
			<input type="text" bind:value={newRisk.title} placeholder="Risk title" />
			<textarea bind:value={newRisk.detail} placeholder="Detail…" rows="2"></textarea>
			<textarea bind:value={newRisk.action} placeholder="Mitigation action…" rows="2"></textarea>
			<div class="add-form-row">
				<select bind:value={newRisk.severity}>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
				<input type="text" bind:value={newRisk.vendor} placeholder="Vendor (optional)" />
				<button class="save-risk-btn" onclick={addRisk}>Save</button>
			</div>
		</div>
	{/if}

	<!-- Risk list -->
	<div class="risk-list">
		{#each filteredRisks as risk (risk.id)}
			<div class="risk-card" style="border-left-color: {sevColor[risk.severity]}">
				<div class="risk-top">
					<span class="risk-sev">{sevIcon[risk.severity]}</span>
					<span class="risk-title">{risk.title}</span>
					{#if risk.vendor}
						<span class="risk-vendor">{risk.vendor}</span>
					{/if}
					<button
						class="risk-status"
						style="color: {statusColor[risk.status]}"
						onclick={() => toggleStatus(risk.id)}
						title="Click to change status"
					>
						{statusIcon[risk.status]} {risk.status}
					</button>
					{#if risk.source === 'ai'}
						<span class="risk-ai">✦ AI</span>
					{/if}
				</div>
				{#if risk.detail}
					<p class="risk-detail">{risk.detail}</p>
				{/if}
				{#if risk.action}
					<p class="risk-action">→ {risk.action}</p>
				{/if}
				<button class="risk-remove" onclick={() => removeRisk(risk.id)}>×</button>
			</div>
		{/each}
		{#if filteredRisks.length === 0}
			<div class="empty">No risks match your filters. Click "AI Detect Risks" to auto-generate from evaluation data.</div>
		{/if}
	</div>
</div>

<style>
	.risks-page { padding: 2rem 1.5rem; max-width: 900px; margin: 0 auto; }
	.risks-header {
		display: flex; justify-content: space-between; align-items: flex-start;
		margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
	}
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.header-actions { display: flex; gap: 0.5rem; }
	.ai-btn {
		padding: 0.45rem 0.85rem; background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2); border-radius: 6px;
		color: var(--t, #00cc96); font-size: 0.8rem; cursor: pointer;
	}
	.ai-btn:disabled { opacity: 0.5; }
	.add-btn {
		padding: 0.45rem 0.85rem; background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.8rem; cursor: pointer;
	}
	.risk-summary {
		display: flex; gap: 0.75rem; margin-bottom: 1.25rem;
	}
	.sum-card {
		flex: 1; padding: 0.75rem; border-radius: 8px; text-align: center;
		background: rgba(0, 0, 0, 0.15);
	}
	.sum-card.high { border-bottom: 2px solid #ef4444; }
	.sum-card.medium { border-bottom: 2px solid #f59e0b; }
	.sum-card.low { border-bottom: 2px solid #3b82f6; }
	.sum-card.mitigated { border-bottom: 2px solid #00cc96; }
	.sum-num {
		display: block; font-size: 1.5rem; font-weight: 700;
		font-family: 'Playfair Display', serif; color: var(--text, #e2e8f0);
	}
	.sum-label { font-size: 0.7rem; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.04em; }
	.filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
	.filters select {
		padding: 0.4rem 0.6rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.8rem;
	}
	.add-form {
		background: rgba(0, 0, 0, 0.15); border-radius: 10px; padding: 1rem;
		display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;
	}
	.add-form input, .add-form textarea, .add-form select {
		padding: 0.5rem 0.75rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.82rem; font-family: 'Figtree', sans-serif;
	}
	.add-form-row { display: flex; gap: 0.5rem; align-items: center; }
	.save-risk-btn {
		padding: 0.4rem 0.85rem; background: var(--t, #00cc96);
		border: none; border-radius: 6px; color: #0b1017;
		font-size: 0.8rem; font-weight: 600; cursor: pointer;
	}
	.risk-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.risk-card {
		background: rgba(0, 0, 0, 0.12); border-left: 3px solid;
		border-radius: 0 8px 8px 0; padding: 0.75rem 1rem; position: relative;
	}
	.risk-top { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
	.risk-sev { font-size: 0.75rem; }
	.risk-title { font-weight: 600; color: var(--text, #e2e8f0); font-size: 0.85rem; }
	.risk-vendor {
		background: rgba(255, 255, 255, 0.06); padding: 0.15rem 0.4rem;
		border-radius: 4px; font-size: 0.7rem; color: var(--text-muted, #94a3b8);
	}
	.risk-status {
		margin-left: auto; padding: 0.15rem 0.5rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px;
		font-size: 0.68rem; cursor: pointer; text-transform: uppercase;
		font-weight: 600; letter-spacing: 0.04em;
	}
	.risk-ai {
		font-size: 0.6rem; color: var(--t, #00cc96); background: rgba(0, 204, 150, 0.1);
		padding: 0.1rem 0.35rem; border-radius: 3px; font-weight: 600;
	}
	.risk-detail { margin: 0.4rem 0 0; font-size: 0.8rem; color: var(--text-muted, #94a3b8); line-height: 1.4; }
	.risk-action { margin: 0.25rem 0 0; font-size: 0.78rem; color: var(--t, #00cc96); opacity: 0.8; }
	.risk-remove {
		position: absolute; top: 0.5rem; right: 0.5rem; width: 20px; height: 20px;
		background: none; border: none; color: var(--text-muted, #64748b);
		font-size: 1rem; cursor: pointer; opacity: 0; transition: opacity 0.15s;
	}
	.risk-card:hover .risk-remove { opacity: 1; }
	.empty {
		padding: 2rem; text-align: center; color: var(--text-muted, #64748b);
		font-size: 0.85rem;
	}
</style>
