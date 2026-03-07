<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import ConfidenceBadge from '$components/ui/ConfidenceBadge.svelte';
	import type { ProjectVendor, Criterion } from '@shortlist/shared-types/project';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();

	let vendors: ProjectVendor[] = $state(data.vendors ?? []);
	let criteria: Criterion[] = $state(data.criteria ?? []);
	let scores: Record<string, Record<string, number>> = $state(
		data.project.state?.scores ?? {}
	);
	let saving = $state(false);
	let activeVendorIdx = $state(0);

	const activeVendor = $derived(vendors[activeVendorIdx]);

	function getScore(vendorId: string, criterionId: string): number {
		return scores[vendorId]?.[criterionId] ?? 0;
	}

	function setScore(vendorId: string, criterionId: string, score: number) {
		if (!scores[vendorId]) {
			scores[vendorId] = {};
		}
		scores = {
			...scores,
			[vendorId]: {
				...scores[vendorId],
				[criterionId]: score
			}
		};
	}

	const completionPct = $derived.by(() => {
		const total = vendors.length * criteria.length;
		if (total === 0) return 0;
		let filled = 0;
		for (const v of vendors) {
			for (const c of criteria) {
				if (getScore(v.id, c.id) > 0) filled++;
			}
		}
		return Math.round((filled / total) * 100);
	});

	async function saveProgress() {
		saving = true;

		const newState = {
			...data.project.state,
			scores
		};

		await supabase
			.from('projects')
			.update({
				state: newState,
				updated_at: new Date().toISOString()
			})
			.eq('id', data.project.id);

		saving = false;
	}

	async function saveAndFinish() {
		saving = true;

		const newState = {
			...data.project.state,
			scores
		};

		await supabase
			.from('projects')
			.update({
				state: newState,
				current_step: 'results',
				updated_at: new Date().toISOString()
			})
			.eq('id', data.project.id);

		goto(`/project/${data.project.id}/results`);
	}
</script>

<svelte:head>
	<title>Ratings — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-ratings">
	<div class="ratings-header">
		<div>
			<h2>Score vendors</h2>
			<p class="step-description">
				Rate each vendor on every criterion (0–10). {completionPct}% complete.
			</p>
		</div>
		<Button variant="secondary" size="sm" onclick={saveProgress} loading={saving}>
			Save progress
		</Button>
	</div>

	<!-- Vendor tabs -->
	<div class="vendor-tabs" role="tablist">
		{#each vendors as vendor, i (vendor.id)}
			<button
				role="tab"
				class="vendor-tab"
				class:active={i === activeVendorIdx}
				aria-selected={i === activeVendorIdx}
				onclick={() => (activeVendorIdx = i)}
			>
				{vendor.name}
			</button>
		{/each}
	</div>

	{#if activeVendor}
		<Card>
			<div class="scoring-grid">
				{#each criteria as criterion (criterion.id)}
					<div class="score-row">
						<div class="score-meta">
							<span class="criterion-name">{criterion.name}</span>
							<span class="criterion-category">{criterion.category}</span>
						</div>
						<div class="score-input">
							<input
								type="range"
								min="0"
								max="10"
								step="1"
								value={getScore(activeVendor.id, criterion.id)}
								oninput={(e) =>
									setScore(activeVendor.id, criterion.id, Number(e.currentTarget.value))}
							/>
							<span class="score-value" class:zero={getScore(activeVendor.id, criterion.id) === 0}>
								{getScore(activeVendor.id, criterion.id)}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${data.project.id}/materials`)}>
			← Back
		</Button>
		<Button variant="primary" onclick={saveAndFinish} loading={saving}>
			View Results →
		</Button>
	</div>
</div>

<style>
	.ratings-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-4);
	}

	.ratings-header h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: 0; }

	.vendor-tabs {
		display: flex;
		gap: var(--space-1);
		margin-bottom: var(--space-4);
		border-bottom: 2px solid var(--neutral-200);
		overflow-x: auto;
	}

	.vendor-tab {
		padding: var(--space-2) var(--space-4);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--neutral-500);
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--transition-fast);
	}

	.vendor-tab:hover {
		color: var(--neutral-700);
	}

	.vendor-tab.active {
		color: var(--primary-700);
		border-bottom-color: var(--primary-600);
	}

	.scoring-grid {
		display: flex;
		flex-direction: column;
	}

	.score-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--neutral-100);
		gap: var(--space-4);
	}

	.score-row:last-child { border-bottom: none; }

	.score-meta {
		flex: 1;
		min-width: 0;
	}

	.criterion-name {
		display: block;
		font-weight: 500;
		color: var(--neutral-800);
		font-size: 0.9375rem;
	}

	.criterion-category {
		font-size: 0.75rem;
		color: var(--neutral-400);
		text-transform: capitalize;
	}

	.score-input {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.score-input input[type="range"] {
		width: 140px;
	}

	.score-value {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--primary-50);
		color: var(--primary-700);
		border-radius: var(--radius-md);
		font-weight: 700;
		font-size: 0.875rem;
	}

	.score-value.zero {
		background: var(--neutral-100);
		color: var(--neutral-400);
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-5);
	}
</style>
