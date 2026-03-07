<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;
	const solveData = data.project.solve_data ?? {};

	interface Constraint {
		id: string;
		type: string;
		description: string;
		hardLimit: boolean;
	}

	interface Stakeholder {
		id: string;
		name: string;
		role: string;
		department: string;
		influence: string;
		concerns: string[];
	}

	let constraints = $state<Constraint[]>(solveData.constraints ?? []);
	let stakeholders = $state<Stakeholder[]>(solveData.stakeholders ?? []);
	let saving = $state(false);
	let suggestingConstraints = $state(false);
	let suggestedConstraints = $state<string[]>([]);

	// New constraint form
	let newType = $state('technical');
	let newDescription = $state('');
	let newHardLimit = $state(true);

	// New stakeholder form
	let shName = $state('');
	let shRole = $state('');
	let shDept = $state('');
	let shInfluence = $state('decision_maker');

	const constraintTypes = [
		{ value: 'technical', label: 'Technical' },
		{ value: 'budget', label: 'Budget' },
		{ value: 'timeline', label: 'Timeline' },
		{ value: 'compliance', label: 'Compliance' },
		{ value: 'integration', label: 'Integration' },
		{ value: 'other', label: 'Other' },
	];

	const influenceTypes = [
		{ value: 'decision_maker', label: 'Decision Maker' },
		{ value: 'influencer', label: 'Influencer' },
		{ value: 'user', label: 'End User' },
		{ value: 'approver', label: 'Approver' },
	];

	async function suggestConstraints() {
		suggestingConstraints = true;
		try {
			const problemDesc = solveData.triggerQuestions?.[0]?.answer ?? '';
			const companySize = solveData.triggerQuestions?.[6]?.answer ?? '';
			const category = solveData.category?.label ?? solveData.categoryDetected ?? '';
			const budget = solveData.budgetRange ?? '';

			const profileDesc = [
				problemDesc,
				companySize ? `Company size: ${companySize}` : '',
				category ? `Category: ${category}` : '',
				budget ? `Budget: ${budget}` : '',
			].filter(Boolean).join('. ');

			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'compliance_suggest',
					projectId,
					context: { profileDesc },
				}),
			});

			if (res.ok) {
				const result = await res.json();
				const data = result.data ?? result.result ?? [];
				suggestedConstraints = Array.isArray(data) ? data : [];
			}
		} catch (err) {
			console.error('Constraint suggestion failed:', err);
		}
		suggestingConstraints = false;
	}

	function addSuggestedConstraint(suggestion: string) {
		// Don't add duplicates
		if (constraints.some(c => c.description.toLowerCase() === suggestion.toLowerCase())) return;
		constraints = [...constraints, {
			id: crypto.randomUUID(),
			type: 'compliance',
			description: suggestion,
			hardLimit: true,
		}];
		suggestedConstraints = suggestedConstraints.filter(s => s !== suggestion);
	}

	function addConstraint() {
		if (!newDescription.trim()) return;
		constraints = [...constraints, {
			id: crypto.randomUUID(),
			type: newType,
			description: newDescription.trim(),
			hardLimit: newHardLimit,
		}];
		newDescription = '';
	}

	function removeConstraint(id: string) {
		constraints = constraints.filter((c) => c.id !== id);
	}

	function addStakeholder() {
		if (!shName.trim() || !shRole.trim()) return;
		stakeholders = [...stakeholders, {
			id: crypto.randomUUID(),
			name: shName.trim(),
			role: shRole.trim(),
			department: shDept.trim(),
			influence: shInfluence,
			concerns: [],
		}];
		shName = '';
		shRole = '';
		shDept = '';
	}

	function removeStakeholder(id: string) {
		stakeholders = stakeholders.filter((s) => s.id !== id);
	}

	async function saveAndContinue() {
		saving = true;
		const newSolveData = {
			...solveData,
			constraints,
			stakeholders,
			completedSteps: [...new Set([...(solveData.completedSteps ?? []), 'triggers', 'category', 'vendor_discovery', 'constraints'])],
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				current_step: 'priorities',
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		goto(`/project/${projectId}/solve/priorities`);
	}
</script>

<svelte:head>
	<title>Constraints — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-constraints">
	<h2>Constraints & Stakeholders</h2>
	<p class="step-description">
		Define hard limits and identify key people involved in this decision.
	</p>

	<!-- Constraints -->
	<Card>
		<h3>Constraints</h3>
		<p class="section-hint">What are the non-negotiable requirements or limits?</p>

		<!-- AI suggestions -->
		{#if suggestedConstraints.length > 0}
			<div class="ai-suggestions">
				<div class="ai-label">✦ AI-suggested compliance requirements</div>
				<div class="suggestion-chips">
					{#each suggestedConstraints as suggestion}
						<button class="suggestion-chip" onclick={() => addSuggestedConstraint(suggestion)}>
							+ {suggestion}
						</button>
					{/each}
				</div>
			</div>
		{:else if constraints.length === 0}
			<div class="ai-suggest-prompt">
				<Button variant="secondary" size="sm" onclick={suggestConstraints} disabled={suggestingConstraints}>
					{suggestingConstraints ? '✦ Analyzing...' : '✦ Suggest constraints based on your profile'}
				</Button>
			</div>
		{/if}

		<div class="add-row">
			<select bind:value={newType} class="form-select form-select-sm">
				{#each constraintTypes as ct}
					<option value={ct.value}>{ct.label}</option>
				{/each}
			</select>
			<input
				type="text"
				bind:value={newDescription}
				placeholder="Describe the constraint..."
				class="form-input"
				onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addConstraint())}
			/>
			<label class="hard-limit-toggle">
				<input type="checkbox" bind:checked={newHardLimit} />
				<span>Hard limit</span>
			</label>
			<Button variant="secondary" size="sm" onclick={addConstraint} disabled={!newDescription.trim()}>
				Add
			</Button>
		</div>

		{#if constraints.length > 0}
			<ul class="item-list">
				{#each constraints as constraint (constraint.id)}
					<li class="item-row">
						<span class="item-type-badge">{constraint.type}</span>
						<span class="item-description">{constraint.description}</span>
						{#if constraint.hardLimit}
							<span class="hard-badge">Hard limit</span>
						{/if}
						<button class="remove-btn" onclick={() => removeConstraint(constraint.id)} type="button" aria-label="Remove">✕</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty-hint">No constraints added yet.</p>
		{/if}
	</Card>

	<!-- Stakeholders -->
	<Card>
		<h3>Stakeholders</h3>
		<p class="section-hint">Who needs to be involved in this decision?</p>

		<div class="add-row stakeholder-row">
			<input type="text" bind:value={shName} placeholder="Name" class="form-input" />
			<input type="text" bind:value={shRole} placeholder="Role / Title" class="form-input" />
			<input type="text" bind:value={shDept} placeholder="Department" class="form-input" />
			<select bind:value={shInfluence} class="form-select form-select-sm">
				{#each influenceTypes as it}
					<option value={it.value}>{it.label}</option>
				{/each}
			</select>
			<Button variant="secondary" size="sm" onclick={addStakeholder} disabled={!shName.trim() || !shRole.trim()}>
				Add
			</Button>
		</div>

		{#if stakeholders.length > 0}
			<ul class="item-list">
				{#each stakeholders as sh (sh.id)}
					<li class="item-row">
						<div class="stakeholder-info">
							<span class="sh-name">{sh.name}</span>
							<span class="sh-role">{sh.role}{sh.department ? ` · ${sh.department}` : ''}</span>
						</div>
						<span class="influence-badge">{sh.influence.replace('_', ' ')}</span>
						<button class="remove-btn" onclick={() => removeStakeholder(sh.id)} type="button" aria-label="Remove">✕</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty-hint">No stakeholders added yet.</p>
		{/if}
	</Card>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${projectId}/solve/discovery`)}>← Back</Button>
		<Button variant="primary" onclick={saveAndContinue} loading={saving}>
			Continue to Priorities →
		</Button>
	</div>
</div>

<style>
	.step-constraints h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }

	h3 { margin-bottom: var(--space-1); }
	.section-hint { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-4); }

	.add-row {
		display: flex; gap: var(--space-2); align-items: center;
		margin-bottom: var(--space-4); flex-wrap: wrap;
	}

	.stakeholder-row { flex-wrap: wrap; }

	.form-input {
		flex: 1; min-width: 120px;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}
	.form-input:focus { outline: var(--focus-ring); border-color: var(--primary-500); }

	.form-select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--color-bg-secondary);
	}
	.form-select-sm { min-width: 120px; }

	.hard-limit-toggle {
		display: flex; align-items: center; gap: var(--space-1);
		font-size: 0.8125rem; color: var(--neutral-600);
		white-space: nowrap; cursor: pointer;
	}

	.item-list { list-style: none; padding: 0; margin: 0; }

	.item-row {
		display: flex; align-items: center; gap: var(--space-2);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--neutral-100);
	}
	.item-row:last-child { border-bottom: none; }

	.item-type-badge {
		font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
		padding: 2px 8px; border-radius: 999px;
		background: var(--neutral-100); color: var(--neutral-600);
		white-space: nowrap;
	}

	.item-description { flex: 1; font-size: 0.9375rem; color: var(--neutral-800); }

	.hard-badge {
		font-size: 0.6875rem; font-weight: 600;
		padding: 2px 8px; border-radius: 999px;
		background: rgba(239, 68, 68, 0.08); color: #dc2626;
		white-space: nowrap;
	}

	.stakeholder-info { flex: 1; }
	.sh-name { font-weight: 500; color: var(--neutral-800); display: block; }
	.sh-role { font-size: 0.8125rem; color: var(--neutral-500); }

	.influence-badge {
		font-size: 0.6875rem; font-weight: 600; text-transform: capitalize;
		padding: 2px 8px; border-radius: 999px;
		background: rgba(74, 150, 248, 0.08); color: #4a96f8;
		white-space: nowrap;
	}

	.remove-btn {
		background: none; border: none; color: var(--neutral-400);
		cursor: pointer; padding: var(--space-1);
		border-radius: var(--radius-sm); font-size: 0.875rem;
	}
	.remove-btn:hover { color: #dc2626; background: #fef2f2; }

	.empty-hint { text-align: center; color: var(--neutral-400); font-size: 0.875rem; padding: var(--space-4) 0; }

	.step-actions {
		display: flex; justify-content: space-between;
		margin-top: var(--space-6); padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	.ai-suggestions {
		padding: var(--space-3);
		background: rgba(74, 150, 248, 0.04);
		border: 1px solid rgba(74, 150, 248, 0.15);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
	}
	.ai-label {
		font-size: 0.75rem; font-weight: 600;
		color: var(--primary-500); margin-bottom: var(--space-2);
		letter-spacing: 0.3px;
	}
	.suggestion-chips { display: flex; flex-wrap: wrap; gap: var(--space-1); }
	.suggestion-chip {
		padding: var(--space-1) var(--space-3);
		background: var(--neutral-50);
		border: 1px solid var(--neutral-200);
		border-radius: 999px;
		font-size: 0.8125rem;
		color: var(--neutral-700);
		cursor: pointer;
		transition: all 0.15s;
	}
	.suggestion-chip:hover {
		border-color: var(--primary-500);
		background: rgba(74, 150, 248, 0.08);
		color: var(--primary-600);
	}
	.ai-suggest-prompt { margin-bottom: var(--space-3); }
</style>
