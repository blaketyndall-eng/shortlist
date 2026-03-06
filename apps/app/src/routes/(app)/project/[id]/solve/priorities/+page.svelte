<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;
	const solveData = data.project.solve_data ?? {};

	type Tier = 'must_have' | 'nice_to_have' | 'bonus';

	interface Priority {
		id: string;
		label: string;
		tier: Tier;
		description: string | null;
	}

	let priorities = $state<Record<Tier, Priority[]>>({
		must_have: solveData.priorities?.must_have ?? [],
		nice_to_have: solveData.priorities?.nice_to_have ?? [],
		bonus: solveData.priorities?.bonus ?? [],
	});

	let newLabel = $state('');
	let newTier = $state<Tier>('must_have');
	let saving = $state(false);

	const tierMeta: { key: Tier; label: string; color: string; bg: string; description: string }[] = [
		{ key: 'must_have', label: 'Must Have', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.06)', description: 'Non-negotiable — vendor fails without these' },
		{ key: 'nice_to_have', label: 'Nice to Have', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.06)', description: 'Important but not dealbreakers' },
		{ key: 'bonus', label: 'Bonus', color: '#00cc96', bg: 'rgba(0, 204, 150, 0.06)', description: 'Would be great, but not required' },
	];

	function addPriority() {
		if (!newLabel.trim()) return;
		priorities = {
			...priorities,
			[newTier]: [...priorities[newTier], {
				id: crypto.randomUUID(),
				label: newLabel.trim(),
				tier: newTier,
				description: null,
			}],
		};
		newLabel = '';
	}

	function removePriority(tier: Tier, id: string) {
		priorities = {
			...priorities,
			[tier]: priorities[tier].filter((p) => p.id !== id),
		};
	}

	function movePriority(id: string, from: Tier, to: Tier) {
		const item = priorities[from].find((p) => p.id === id);
		if (!item) return;
		priorities = {
			...priorities,
			[from]: priorities[from].filter((p) => p.id !== id),
			[to]: [...priorities[to], { ...item, tier: to }],
		};
	}

	async function saveAndContinue() {
		saving = true;
		const newSolveData = {
			...solveData,
			priorities,
			completedSteps: [...new Set([...(solveData.completedSteps ?? []), 'triggers', 'category', 'vendor_discovery', 'constraints', 'priorities'])],
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				current_step: 'brief',
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		goto(`/project/${projectId}/solve/brief`);
	}

	const totalPriorities = $derived(
		priorities.must_have.length + priorities.nice_to_have.length + priorities.bonus.length
	);
</script>

<svelte:head>
	<title>Priorities — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-priorities">
	<h2>Set Your Priorities</h2>
	<p class="step-description">
		Categorize your requirements into must-have, nice-to-have, and bonus tiers.
	</p>

	<div class="add-priority">
		<input
			type="text"
			bind:value={newLabel}
			placeholder="Add a requirement (e.g., SSO support, API access, Mobile app)"
			class="form-input"
			onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addPriority())}
		/>
		<select bind:value={newTier} class="form-select">
			{#each tierMeta as tm}
				<option value={tm.key}>{tm.label}</option>
			{/each}
		</select>
		<Button variant="secondary" size="sm" onclick={addPriority} disabled={!newLabel.trim()}>
			Add
		</Button>
	</div>

	<div class="tiers">
		{#each tierMeta as tm (tm.key)}
			<Card>
				<div class="tier-header" style="border-left: 3px solid {tm.color};">
					<h3 style="color: {tm.color}">{tm.label}</h3>
					<span class="tier-count">{priorities[tm.key].length}</span>
				</div>
				<p class="tier-description">{tm.description}</p>

				{#if priorities[tm.key].length > 0}
					<ul class="priority-list">
						{#each priorities[tm.key] as priority (priority.id)}
							<li class="priority-item" style="background: {tm.bg}">
								<span class="priority-label">{priority.label}</span>
								<div class="priority-actions">
									{#each tierMeta.filter((t) => t.key !== tm.key) as target}
										<button
											class="move-btn"
											onclick={() => movePriority(priority.id, tm.key, target.key)}
											type="button"
											title="Move to {target.label}"
											style="color: {target.color}"
										>
											→ {target.label.split(' ')[0]}
										</button>
									{/each}
									<button
										class="remove-btn"
										onclick={() => removePriority(tm.key, priority.id)}
										type="button"
										aria-label="Remove"
									>✕</button>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty-tier">No items in this tier yet</p>
				{/if}
			</Card>
		{/each}
	</div>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${projectId}/solve/constraints`)}>← Back</Button>
		<Button
			variant="primary"
			onclick={saveAndContinue}
			loading={saving}
			disabled={totalPriorities === 0}
		>
			Continue to Brief →
		</Button>
	</div>
</div>

<style>
	.step-priorities h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }

	.add-priority {
		display: flex; gap: var(--space-2); margin-bottom: var(--space-5);
	}

	.form-input {
		flex: 1; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md); font-size: 0.9375rem;
	}
	.form-input:focus { outline: var(--focus-ring); border-color: var(--primary-500); }

	.form-select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md); font-size: 0.9375rem;
		background: var(--color-bg-secondary); min-width: 140px;
	}

	.tiers { display: flex; flex-direction: column; gap: var(--space-4); }

	.tier-header {
		display: flex; align-items: center; justify-content: space-between;
		padding-left: var(--space-3); margin-bottom: var(--space-1);
	}
	.tier-header h3 { font-size: 1rem; margin: 0; }
	.tier-count {
		font-size: 0.75rem; font-weight: 600;
		background: var(--neutral-100); color: var(--neutral-600);
		padding: 2px 8px; border-radius: 999px;
	}

	.tier-description { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-3); }

	.priority-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }

	.priority-item {
		display: flex; align-items: center; justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
	}

	.priority-label { font-size: 0.9375rem; font-weight: 500; color: var(--neutral-800); }

	.priority-actions { display: flex; align-items: center; gap: var(--space-2); }

	.move-btn {
		background: none; border: none; font-size: 0.6875rem;
		cursor: pointer; padding: 2px 6px; border-radius: var(--radius-sm);
		font-weight: 500; opacity: 0.6;
	}
	.move-btn:hover { opacity: 1; background: rgba(0,0,0,0.04); }

	.remove-btn {
		background: none; border: none; color: var(--neutral-400);
		cursor: pointer; padding: var(--space-1); font-size: 0.875rem;
	}
	.remove-btn:hover { color: #dc2626; }

	.empty-tier { text-align: center; color: var(--neutral-400); font-size: 0.8125rem; padding: var(--space-3); }

	.step-actions {
		display: flex; justify-content: space-between;
		margin-top: var(--space-6); padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	@media (max-width: 640px) {
		.add-priority { flex-direction: column; }
	}
</style>
