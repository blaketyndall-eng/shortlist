<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const scopeId = $page.params.id;
	let scope = $state<any>(null);
	let saving = $state(false);
	let analyzing = $state(false);
	let aiError = $state('');

	let recommendations = $state<any[]>([]);
	let selectedApproach = $state<string>('');
	let reasoning = $state('');

	const APPROACH_CARDS = [
		{ key: 'buy', label: 'Buy Software', icon: '🛒', desc: 'Purchase a commercial solution' },
		{ key: 'build', label: 'Build Internally', icon: '🔨', desc: 'Develop a custom solution in-house' },
		{ key: 'fix', label: 'Fix Existing', icon: '🔧', desc: 'Improve current tools or processes' },
		{ key: 'partner', label: 'Partner / Outsource', icon: '🤝', desc: 'Engage a third party' },
		{ key: 'do_nothing', label: 'Do Nothing', icon: '⏸', desc: 'Accept the status quo' },
	];

	onMount(async () => {
		const res = await fetch(`/api/scopes/${scopeId}`);
		if (res.ok) {
			scope = await res.json();
			const o = scope.data?.options;
			if (o) {
				recommendations = o.recommendations ?? [];
				selectedApproach = o.selectedApproach ?? '';
				reasoning = o.reasoning ?? '';
			}
		}
	});

	async function getRecommendations() {
		analyzing = true;
		aiError = '';
		try {
			const signal = scope?.data?.signal ?? {};
			const cause = scope?.data?.cause ?? {};
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_options_recommend',
					depth: 'standard',
					scopeId,
					context: {
						trigger: signal.trigger,
						hypothesis: cause.hypothesis,
						businessImpact: signal.businessImpact,
						urgency: signal.urgency,
						impactedUsers: signal.impactedUsers,
					},
				}),
			});
			if (res.ok) {
				const data = await res.json();
				const result = data.result ?? data.data ?? {};
				recommendations = result.approaches ?? [];
				reasoning = result.reasoning ?? '';
				if (result.recommended && !selectedApproach) {
					selectedApproach = result.recommended;
				}
			} else {
				aiError = 'Recommendation failed — try again or select manually.';
			}
		} catch {
			aiError = 'Recommendation failed — try again or select manually.';
		}
		analyzing = false;
	}

	function getRecommendation(key: string) {
		return recommendations.find((r) => r.approach === key);
	}

	async function saveAndContinue() {
		if (!selectedApproach) return;
		saving = true;
		await fetch(`/api/scopes/${scopeId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				data: { ...scope?.data, options: { recommendations, selectedApproach, reasoning } },
				current_step: 'prepare',
				decision: selectedApproach,
			}),
		});
		goto(`/scope/${scopeId}/prepare`);
	}
</script>

<svelte:head>
	<title>Options — SCOPE — Shortlist</title>
</svelte:head>

<div class="step-page">
	<h2>Evaluate Your Options</h2>
	<p class="step-desc">What's the best path forward? Get AI recommendations or select your approach manually.</p>

	<div class="ai-section">
		<button class="ai-btn" onclick={getRecommendations} disabled={analyzing}>
			{#if analyzing}
				<span class="spinner"></span> Analyzing...
			{:else}
				✦ Get AI Recommendations
			{/if}
		</button>
		{#if aiError}
			<div class="ai-error">{aiError}</div>
		{/if}
	</div>

	<div class="approach-grid">
		{#each APPROACH_CARDS as card (card.key)}
			{@const rec = getRecommendation(card.key)}
			<button
				class="approach-card"
				class:selected={selectedApproach === card.key}
				onclick={() => { selectedApproach = card.key; }}
			>
				<div class="card-top">
					<span class="card-icon">{card.icon}</span>
					<span class="card-label">{card.label}</span>
					{#if rec?.score !== undefined}
						<span class="card-score">{rec.score}</span>
					{/if}
				</div>
				<p class="card-desc">{card.desc}</p>

				{#if rec}
					<div class="card-details">
						{#if rec.pros?.length}
							<div class="detail-group">
								<span class="detail-title good">Pros</span>
								{#each rec.pros.slice(0, 2) as pro}
									<span class="detail-item">+ {pro}</span>
								{/each}
							</div>
						{/if}
						{#if rec.cons?.length}
							<div class="detail-group">
								<span class="detail-title bad">Cons</span>
								{#each rec.cons.slice(0, 2) as con}
									<span class="detail-item">- {con}</span>
								{/each}
							</div>
						{/if}
						{#if rec.timeline}
							<div class="detail-meta">
								<span>Timeline: {rec.timeline}</span>
								{#if rec.costRange}<span>Cost: {rec.costRange}</span>{/if}
							</div>
						{/if}
					</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if reasoning}
		<div class="reasoning-box">
			<span class="reasoning-label">AI Reasoning</span>
			<p>{reasoning}</p>
		</div>
	{/if}

	<div class="step-actions">
		<a href="/scope/{scopeId}/cause" class="btn-ghost">← Back</a>
		<button class="btn-primary" onclick={saveAndContinue} disabled={!selectedApproach || saving}>
			{saving ? 'Saving...' : 'Continue to Prepare →'}
		</button>
	</div>
</div>

<style>
	.step-page h2 { color: var(--text, #e2e8f0); margin-bottom: 0.25rem; }
	.step-desc { color: var(--text-muted, #94a3b8); font-size: 0.875rem; margin-bottom: 1.5rem; }

	.ai-section { margin-bottom: 1.25rem; }
	.ai-btn {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.6rem 1.25rem; background: rgba(0, 204, 150, 0.08);
		border: 1px dashed rgba(0, 204, 150, 0.25); border-radius: 8px;
		color: #00cc96; font-size: 0.8125rem; font-weight: 600; cursor: pointer; width: 100%;
	}
	.ai-btn:hover { background: rgba(0, 204, 150, 0.15); }
	.ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.spinner {
		width: 14px; height: 14px; border: 2px solid rgba(0, 204, 150, 0.2);
		border-top-color: #00cc96; border-radius: 50%; animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.ai-error {
		margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.08);
		border-radius: 6px; color: #f87171; font-size: 0.8rem;
	}

	.approach-grid {
		display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.6rem; margin-bottom: 1.5rem;
	}

	.approach-card {
		text-align: left; padding: 1rem;
		background: rgba(0, 0, 0, 0.15); border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 10px; cursor: pointer; transition: all 0.15s;
	}
	.approach-card:hover { border-color: rgba(0, 204, 150, 0.2); }
	.approach-card.selected {
		border-color: #00cc96; background: rgba(0, 204, 150, 0.06);
		box-shadow: 0 0 12px rgba(0, 204, 150, 0.1);
	}

	.card-top { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem; }
	.card-icon { font-size: 1.1rem; }
	.card-label { font-weight: 600; font-size: 0.8125rem; color: var(--text, #e2e8f0); }
	.card-score {
		margin-left: auto; font-size: 0.75rem; font-weight: 700;
		background: rgba(0, 204, 150, 0.12); color: #00cc96;
		padding: 1px 6px; border-radius: 4px;
	}
	.card-desc { font-size: 0.75rem; color: var(--text-muted, #94a3b8); margin: 0; }

	.card-details { margin-top: 0.6rem; border-top: 1px solid rgba(255, 255, 255, 0.04); padding-top: 0.5rem; }
	.detail-group { margin-bottom: 0.3rem; }
	.detail-title {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.06em; display: block; margin-bottom: 0.1rem;
	}
	.detail-title.good { color: #00cc96; }
	.detail-title.bad { color: #f87171; }
	.detail-item { display: block; font-size: 0.7rem; color: var(--text-muted, #94a3b8); }
	.detail-meta {
		display: flex; gap: 0.75rem; font-size: 0.65rem;
		color: var(--text-muted, #64748b); margin-top: 0.35rem;
	}

	.reasoning-box {
		padding: 0.85rem 1rem; background: rgba(74, 150, 248, 0.04);
		border: 1px solid rgba(74, 150, 248, 0.12); border-radius: 8px; margin-bottom: 1.5rem;
	}
	.reasoning-label {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.1em; color: #4a96f8; display: block; margin-bottom: 0.25rem;
	}
	.reasoning-box p { font-size: 0.8125rem; color: var(--text-muted, #94a3b8); margin: 0; }

	.step-actions {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.btn-ghost { background: none; border: none; color: var(--text-muted, #94a3b8); font-size: 0.875rem; cursor: pointer; text-decoration: none; }
	.btn-ghost:hover { color: var(--text, #e2e8f0); text-decoration: none; }
	.btn-primary {
		padding: 0.6rem 1.5rem; background: #00cc96; color: #0a0f1e;
		border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;
	}
	.btn-primary:hover { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
