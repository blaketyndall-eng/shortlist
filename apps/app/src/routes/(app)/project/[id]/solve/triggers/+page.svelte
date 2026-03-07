<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import TriggerChip from '$components/solve/TriggerChip.svelte';
	import QuestionBlock from '$components/solve/QuestionBlock.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;

	// Trigger options matching prototype
	const triggerOptions = [
		{ id: 'pain', icon: '⚠️', label: 'Existing tool failing' },
		{ id: 'growth', icon: '📈', label: 'Team is scaling' },
		{ id: 'new', icon: '✨', label: 'New capability needed' },
		{ id: 'cost', icon: '💰', label: 'Cost reduction' },
		{ id: 'merge', icon: '🔗', label: 'Merger / acquisition' },
		{ id: 'audit', icon: '🔒', label: 'Compliance / audit' },
		{ id: 'manual', icon: '🔄', label: 'Too manual / slow' },
		{ id: 'replace', icon: '🔁', label: 'Replacing legacy system' },
	];

	// State from solve_data or defaults
	const solveData = data.project.solve_data ?? {};
	let selectedTriggers = $state<string[]>(
		(solveData.triggers ?? []).filter((t: any) => t.selected).map((t: any) => t.id) ?? []
	);
	let problemDescription = $state(solveData.triggerQuestions?.[0]?.answer ?? '');
	let whoAffected = $state(solveData.triggerQuestions?.[1]?.answer ?? '');
	let frequency = $state(solveData.triggerQuestions?.[2]?.answer ?? '');
	let costOfNothing = $state(solveData.triggerQuestions?.[3]?.answer ?? '');
	let successLooks = $state(solveData.triggerQuestions?.[4]?.answer ?? '');
	let currentTool = $state(solveData.triggerQuestions?.[5]?.answer ?? '');
	let companySize = $state(solveData.triggerQuestions?.[6]?.answer ?? '');
	let budgetRange = $state(solveData.budgetRange ?? '');
	let timeline = $state(solveData.timeline ?? '');
	let saving = $state(false);
	let validationErrors = $state<string[]>([]);
	let showValidation = $state(false);
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	let lastAutosave = $state('');

	function toggleTrigger(id: string) {
		if (selectedTriggers.includes(id)) {
			selectedTriggers = selectedTriggers.filter((t) => t !== id);
		} else {
			selectedTriggers = [...selectedTriggers, id];
		}
		scheduleAutosave();
	}

	// Autosave — debounced save on any field change
	function scheduleAutosave() {
		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(async () => {
			const newSolveData = {
				...(data.project.solve_data ?? {}),
				...buildSolveData(),
			};
			await supabase
				.from('projects')
				.update({ solve_data: newSolveData, updated_at: new Date().toISOString() })
				.eq('id', projectId);
			lastAutosave = new Date().toLocaleTimeString();
		}, 3000);
	}

	// Validate before proceeding
	function validate(): string[] {
		const errors: string[] = [];
		if (selectedTriggers.length === 0) {
			errors.push('Select at least one trigger for your search');
		}
		if (!problemDescription.trim() || problemDescription.trim().length < 15) {
			errors.push('Describe the problem in at least a few sentences (15+ characters)');
		}
		if (!budgetRange.trim()) {
			errors.push('Provide an estimated budget range to help with vendor matching');
		}
		return errors;
	}

	function buildSolveData() {
		return {
			triggers: triggerOptions.map((t) => ({
				id: t.id,
				label: t.label,
				selected: selectedTriggers.includes(t.id),
				detail: null,
			})),
			triggerQuestions: [
				{ id: 'problem', question: 'Describe the problem', answer: problemDescription || null, triggerId: 'general' },
				{ id: 'who', question: 'Who is affected', answer: whoAffected || null, triggerId: 'general' },
				{ id: 'frequency', question: 'How frequently', answer: frequency || null, triggerId: 'general' },
				{ id: 'cost_nothing', question: 'Cost of doing nothing', answer: costOfNothing || null, triggerId: 'general' },
				{ id: 'success', question: 'Success in 90 days', answer: successLooks || null, triggerId: 'general' },
				{ id: 'current_tool', question: 'Current tool/approach', answer: currentTool || null, triggerId: 'general' },
				{ id: 'company_size', question: 'Company size', answer: companySize || null, triggerId: 'general' },
			],
			budgetRange: budgetRange || null,
			timeline: timeline || null,
			completedSteps: selectedTriggers.length > 0 && problemDescription.trim()
				? ['triggers']
				: [],
		};
	}

	async function saveAndContinue() {
		showValidation = true;
		validationErrors = validate();
		if (validationErrors.length > 0) return;

		saving = true;
		if (autosaveTimer) clearTimeout(autosaveTimer);

		const newSolveData = {
			...(data.project.solve_data ?? {}),
			...buildSolveData(),
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				current_step: 'category',
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		goto(`/project/${projectId}/solve/category`);
	}

	async function saveDraft() {
		saving = true;
		if (autosaveTimer) clearTimeout(autosaveTimer);

		const newSolveData = {
			...(data.project.solve_data ?? {}),
			...buildSolveData(),
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		saving = false;
		lastAutosave = new Date().toLocaleTimeString();
	}

	const canContinue = $derived(selectedTriggers.length > 0 && problemDescription.trim().length > 10);

	// Wire autosave to reactive field changes
	$effect(() => {
		// Track field changes for autosave (reading the values creates subscriptions)
		const _ = [problemDescription, whoAffected, frequency, costOfNothing, successLooks, currentTool, companySize, budgetRange, timeline];
		if (_.some(v => v)) scheduleAutosave();
	});
</script>

<svelte:head>
	<title>Diagnose — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-triggers">
	<h2>What triggered this search?</h2>
	<p class="step-description">
		Help us understand what's driving your need so we can find the right category and vendors.
	</p>

	<QuestionBlock number={1} question="What triggered this search?">
		<div class="trigger-grid">
			{#each triggerOptions as trigger (trigger.id)}
				<TriggerChip
					icon={trigger.icon}
					label={trigger.label}
					selected={selectedTriggers.includes(trigger.id)}
					onclick={() => toggleTrigger(trigger.id)}
				/>
			{/each}
		</div>
	</QuestionBlock>

	<QuestionBlock
		number={2}
		question="Describe the problem in plain language"
		hint="Shortlist will use this to identify your software category and suggest relevant options."
	>
		<textarea
			bind:value={problemDescription}
			placeholder="What is broken, missing, or too painful right now? The more specific, the better. e.g. 'Our sales team of 12 is tracking deals in three spreadsheets...'"
			rows="4"
			class="form-textarea"
		></textarea>
	</QuestionBlock>

	<QuestionBlock number={3} question="Who is affected, and how often?">
		<div class="form-row-2">
			<input
				type="text"
				bind:value={whoAffected}
				placeholder="Who is impacted (e.g., Sales team of 12, daily users)"
				class="form-input"
			/>
			<select bind:value={frequency} class="form-select">
				<option value="">How frequently</option>
				<option value="multiple_daily">Multiple times daily</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="monthly">Monthly</option>
			</select>
		</div>
	</QuestionBlock>

	<QuestionBlock number={4} question="What is the cost of doing nothing?">
		<textarea
			bind:value={costOfNothing}
			placeholder="If no decision is made in the next 90 days, what happens? Lost revenue, compliance risk, team burnout, lost deals?"
			rows="3"
			class="form-textarea"
		></textarea>
	</QuestionBlock>

	<QuestionBlock number={5} question="What does success look like in 90 days?">
		<textarea
			bind:value={successLooks}
			placeholder="If you make the right call, what's measurably better? e.g. 'Reps spend 20% less time on admin...'"
			rows="3"
			class="form-textarea"
		></textarea>
	</QuestionBlock>

	<QuestionBlock number={6} question="What are you replacing or adding to?">
		<div class="form-row-2">
			<input
				type="text"
				bind:value={currentTool}
				placeholder="Current tool / approach (e.g., Spreadsheets, Salesforce)"
				class="form-input"
			/>
			<select bind:value={companySize} class="form-select">
				<option value="">Company size</option>
				<option value="1-10">1–10</option>
				<option value="11-50">11–50</option>
				<option value="51-200">51–200</option>
				<option value="201-1000">201–1,000</option>
				<option value="1000+">1,000+</option>
			</select>
		</div>
	</QuestionBlock>

	<QuestionBlock number={7} question="Project context">
		<div class="form-row-3">
			<div class="form-field">
				<label for="timeline">Decision deadline</label>
				<input
					id="timeline"
					type="text"
					bind:value={timeline}
					placeholder="e.g., End of Q2"
					class="form-input"
				/>
			</div>
			<div class="form-field">
				<label for="budget">Annual budget</label>
				<input
					id="budget"
					type="text"
					bind:value={budgetRange}
					placeholder="e.g., $20k–$50k"
					class="form-input"
				/>
			</div>
		</div>
	</QuestionBlock>

	{#if showValidation && validationErrors.length > 0}
		<div class="validation-errors">
			{#each validationErrors as err}
				<p class="validation-error">⚠ {err}</p>
			{/each}
		</div>
	{/if}

	<div class="step-actions">
		{#if lastAutosave}
			<span class="autosave-indicator">Saved at {lastAutosave}</span>
		{/if}
		<div class="step-actions-buttons">
			<Button variant="ghost" onclick={saveDraft} loading={saving}>Save draft</Button>
			<Button
				variant="primary"
				onclick={saveAndContinue}
				loading={saving}
				disabled={!canContinue}
			>
				Continue to Category →
			</Button>
		</div>
	</div>
</div>

<style>
	.step-triggers h2 {
		margin-bottom: var(--space-1);
	}

	.step-description {
		color: var(--neutral-500);
		margin-bottom: var(--space-6);
	}

	.trigger-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-2);
	}

	.form-textarea {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-family: inherit;
		resize: vertical;
		line-height: 1.5;
	}

	.form-textarea:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.form-input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}

	.form-input:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.form-select {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		background: var(--color-bg-secondary);
		cursor: pointer;
	}

	.form-select:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.form-row-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.form-row-3 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.form-field label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--neutral-600);
		margin-bottom: var(--space-1);
	}

	.validation-errors {
		background: rgba(240, 80, 80, 0.06);
		border: 1px solid rgba(240, 80, 80, 0.2);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		margin-top: var(--space-4);
	}

	.validation-error {
		font-size: 0.8125rem;
		color: #dc2626;
		margin: 0;
		line-height: 1.75;
	}

	.autosave-indicator {
		font-size: 0.75rem;
		color: var(--neutral-400);
		font-style: italic;
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-6);
		padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	.step-actions-buttons {
		display: flex;
		gap: var(--space-3);
	}

	@media (max-width: 640px) {
		.trigger-grid {
			grid-template-columns: 1fr;
		}

		.form-row-2,
		.form-row-3 {
			grid-template-columns: 1fr;
		}
	}
</style>
