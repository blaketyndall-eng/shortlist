<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import type { Criterion } from '@shortlist/shared-types/project';

	let { data } = $props();

	const supabase = createSupabaseBrowserClient();
	let criteria: Criterion[] = $state(data.criteria ?? []);
	let newName = $state('');
	let newCategory = $state('functional');
	let saving = $state(false);
	let aiLoading = $state(false);

	const categoryOptions = [
		{ value: 'functional', label: 'Functional' },
		{ value: 'technical', label: 'Technical' },
		{ value: 'commercial', label: 'Commercial' },
		{ value: 'strategic', label: 'Strategic' },
		{ value: 'risk', label: 'Risk' }
	];

	function addCriterion() {
		if (!newName.trim()) return;

		criteria = [
			...criteria,
			{
				id: crypto.randomUUID(),
				name: newName.trim(),
				category: newCategory,
				weight: 5,
				description: null,
				source: 'user'
			}
		];

		newName = '';
	}

	function removeCriterion(id: string) {
		criteria = criteria.filter((c) => c.id !== id);
	}

	function updateWeight(id: string, weight: number) {
		criteria = criteria.map((c) => (c.id === id ? { ...c, weight } : c));
	}

	async function suggestWithAI() {
		aiLoading = true;

		try {
			const response = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'evaluate',
					depth: 'quick',
					context: {
						task: 'suggest_criteria',
						projectName: data.project.name,
						category: data.project.category,
						existingCriteria: criteria.map((c) => c.name),
						vendors: data.vendors.map((v: any) => v.name)
					},
					projectId: data.project.id
				})
			});

			if (response.ok) {
				const result = await response.json();
				if (result.result?.criteria) {
					const suggested: Criterion[] = result.result.criteria.map((c: any) => ({
						id: crypto.randomUUID(),
						name: c.name,
						category: c.category ?? 'functional',
						weight: c.weight ?? 5,
						description: c.description ?? null,
						source: 'ai_suggested' as const
					}));
					criteria = [...criteria, ...suggested];
				}
			}
		} catch {
			// Silently fail — AI suggestions are optional
		}

		aiLoading = false;
	}

	async function saveAndContinue() {
		if (criteria.length < 1) return;

		saving = true;

		const weights: Record<string, number> = {};
		criteria.forEach((c) => { weights[c.id] = c.weight; });

		const newState = {
			...data.project.state,
			criteria,
			weights
		};

		await supabase
			.from('projects')
			.update({
				state: newState,
				current_step: 'workflow',
				updated_at: new Date().toISOString()
			})
			.eq('id', data.project.id);

		goto(`/project/${data.project.id}/workflow`);
	}
</script>

<svelte:head>
	<title>Criteria — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-criteria">
	<div class="step-header">
		<div>
			<h2>Define evaluation criteria</h2>
			<p class="step-description">What factors matter most for this decision?</p>
		</div>
		<Button variant="secondary" size="sm" onclick={suggestWithAI} loading={aiLoading}>
			✦ Suggest with AI
		</Button>
	</div>

	<Card>
		<div class="add-form">
			<input
				type="text"
				bind:value={newName}
				placeholder="Criterion name (e.g., Ease of integration)"
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addCriterion())}
			/>
			<select bind:value={newCategory}>
				{#each categoryOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
			<Button variant="secondary" size="sm" onclick={addCriterion} disabled={!newName.trim()}>
				Add
			</Button>
		</div>

		{#if criteria.length > 0}
			<table class="criteria-table">
				<thead>
					<tr>
						<th>Criterion</th>
						<th>Category</th>
						<th>Weight (1-10)</th>
						<th>Source</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each criteria as criterion (criterion.id)}
						<tr>
							<td class="name-cell">
								{criterion.name}
								{#if criterion.description}
									<span class="desc-hint" title={criterion.description}>ℹ</span>
								{/if}
							</td>
							<td>
								<span class="category-badge">{criterion.category}</span>
							</td>
							<td>
								<input
									type="range"
									min="1"
									max="10"
									value={criterion.weight}
									oninput={(e) => updateWeight(criterion.id, Number(e.currentTarget.value))}
								/>
								<span class="weight-val">{criterion.weight}</span>
							</td>
							<td>
								{#if criterion.source === 'ai_suggested'}
									<span class="source-ai">✦ AI</span>
								{:else}
									<span class="source-user">Manual</span>
								{/if}
							</td>
							<td>
								<button
									class="remove-btn"
									onclick={() => removeCriterion(criterion.id)}
									aria-label="Remove {criterion.name}"
								>
									✕
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="empty-hint">No criteria yet. Add your own or use AI to suggest some.</p>
		{/if}
	</Card>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${data.project.id}/setup`)}>
			← Back
		</Button>
		<Button
			variant="primary"
			onclick={saveAndContinue}
			loading={saving}
			disabled={criteria.length < 1}
		>
			Continue to Workflow →
		</Button>
	</div>
</div>

<style>
	.step-criteria .step-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-5);
	}

	.step-description {
		color: var(--mu);
		margin-bottom: 0;
	}

	.add-form {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.add-form input {
		flex: 2;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--b);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--s1);
		color: var(--tx);
	}

	.add-form select {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--b);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		background: var(--s1);
		color: var(--tx);
	}

	.add-form input:focus,
	.add-form select:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.criteria-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.criteria-table th {
		text-align: left;
		padding: var(--space-2) var(--space-3);
		border-bottom: 2px solid var(--b);
		color: var(--mu);
		font-weight: 500;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.criteria-table td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--b);
		vertical-align: middle;
	}

	.name-cell {
		font-weight: 500;
		color: var(--tx);
	}

	.desc-hint {
		color: var(--mu);
		cursor: help;
		margin-left: var(--space-1);
	}

	.category-badge {
		display: inline-block;
		padding: 2px var(--space-2);
		background: var(--s2);
		border-radius: 9999px;
		font-size: 0.75rem;
		color: var(--mu);
		text-transform: capitalize;
	}

	.criteria-table input[type="range"] {
		width: 80px;
		vertical-align: middle;
	}

	.weight-val {
		display: inline-block;
		width: 20px;
		text-align: center;
		font-weight: 600;
		color: var(--tx);
		margin-left: var(--space-1);
	}

	.source-ai {
		color: var(--t);
		font-size: 0.75rem;
	}

	.source-user {
		color: var(--mu);
		font-size: 0.75rem;
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--mu);
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
	}

	.remove-btn:hover {
		color: var(--rd);
		background: rgba(240, 80, 80, 0.1);
	}

	.empty-hint {
		text-align: center;
		color: var(--mu);
		padding: var(--space-6) 0;
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-5);
	}
</style>
