<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let mode = $state<'choose' | 'solve'>('choose');
	let name = $state('');
	let description = $state('');
	let category = $state('');
	let loading = $state(false);
	let error = $state('');

	const supabase = createSupabaseBrowserClient();

	const categories = [
		{ value: 'software', label: 'Software / SaaS' },
		{ value: 'services', label: 'Professional Services' },
		{ value: 'hardware', label: 'Hardware / Equipment' },
		{ value: 'infrastructure', label: 'Infrastructure / Cloud' },
		{ value: 'marketing', label: 'Marketing / Agency' },
		{ value: 'other', label: 'Other' }
	];

	async function handleCreate(e?: Event) {
		e?.preventDefault();
		if (!name.trim()) {
			error = 'Project name is required';
			return;
		}

		loading = true;
		error = '';

		const { data: user } = await supabase.auth.getUser();
		if (!user.user) {
			error = 'Not authenticated';
			loading = false;
			return;
		}

		const { data: project, error: dbError } = await supabase
			.from('projects')
			.insert({
				name: name.trim(),
				description: description.trim() || null,
				category: category || null,
				type: 'evaluate',
				status: 'active',
				current_step: 'setup',
				owner_id: user.user.id,
				created_by: user.user.id,
				state: {
					vendors: [],
					criteria: [],
					weights: {},
					scores: {},
					aiContext: {}
				}
			})
			.select()
			.single();

		if (dbError) {
			error = dbError.message;
			loading = false;
			return;
		}

		// Member + activity log are handled by the DB trigger (handle_new_project)
		goto(`/project/${project.id}/setup`);
	}
</script>

<svelte:head>
	<title>New Project — Shortlist</title>
</svelte:head>

<div class="new-project">
	{#if mode === 'choose'}
		<header class="page-header">
			<h1>How would you like to start?</h1>
			<p>Choose the right starting point for your procurement journey.</p>
		</header>

		<div class="choice-grid">
			<a href="/scope/new" class="choice-card recommended">
				<div class="choice-badge">Recommended</div>
				<span class="choice-icon">🔍</span>
				<h3>Start with SCOPE</h3>
				<p>Not sure if you should buy? Run a diagnostic first. SCOPE helps you evaluate whether buying software is the right path — or if building, fixing, or partnering makes more sense.</p>
				<span class="choice-steps">Signal → Cause → Options → Prepare → Endorse</span>
			</a>

			<button class="choice-card" onclick={() => { mode = 'solve'; }}>
				<span class="choice-icon">⚡</span>
				<h3>Jump to SOLVE</h3>
				<p>Already decided to buy? Skip the diagnostic and go straight to defining requirements, discovering vendors, and running evaluations.</p>
				<span class="choice-steps">Define → Evaluate → Decide</span>
			</button>
		</div>

		<div class="choice-footer">
			<a href="/dashboard" class="back-link">← Back to Dashboard</a>
		</div>
	{:else}
	<header class="page-header">
		<button class="back-to-choice" onclick={() => { mode = 'choose'; }}>← Back to options</button>
		<h1>Create a new project</h1>
		<p>Start evaluating vendors for your procurement decision.</p>
	</header>

	<Card>
		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleCreate(e); }}>
			<label class="field">
				<span>Project name <em>*</em></span>
				<input
					type="text"
					bind:value={name}
					placeholder="e.g., CRM Platform Evaluation"
					required
					maxlength="120"
				/>
			</label>

			<label class="field">
				<span>Description</span>
				<textarea
					bind:value={description}
					placeholder="What are you evaluating and why?"
					rows="3"
				></textarea>
			</label>

			<fieldset class="field">
				<legend>Category</legend>
				<div class="category-grid">
					{#each categories as cat}
						<label class="category-option" class:selected={category === cat.value}>
							<input
								type="radio"
								name="category"
								value={cat.value}
								bind:group={category}
							/>
							<span>{cat.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>

			<div class="actions">
				<Button variant="ghost" type="button" onclick={() => goto('/dashboard')}>
					Cancel
				</Button>
				<Button variant="primary" type="submit" {loading}>
					Create Project
				</Button>
			</div>
		</form>
	</Card>
	{/if}
</div>

<style>
	.new-project {
		max-width: 640px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.page-header h1 {
		margin-bottom: var(--space-1);
	}

	.page-header p {
		color: var(--neutral-500);
		margin-bottom: 0;
	}

	.error-banner {
		background: rgba(240, 80, 80, 0.1);
		color: #f05050;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
		font-size: 0.875rem;
	}

	.field {
		display: block;
		margin-bottom: var(--space-5);
		border: none;
		padding: 0;
	}

	.field span, .field legend {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--space-2);
		color: var(--neutral-700);
	}

	.field em {
		color: #dc2626;
		font-style: normal;
	}

	.field input[type="text"],
	.field textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-family: inherit;
		transition: border-color var(--transition-fast);
		resize: vertical;
	}

	.field input:focus,
	.field textarea:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--space-2);
	}

	.category-option {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all var(--transition-fast);
	}

	.category-option:hover {
		border-color: var(--primary-300);
	}

	.category-option.selected {
		border-color: var(--primary-500);
		background: var(--primary-50);
	}

	.category-option input {
		margin: 0;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	.choice-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.choice-card {
		position: relative;
		text-align: left;
		padding: var(--space-6);
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all 0.15s;
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.choice-card:hover {
		border-color: var(--primary-400);
		box-shadow: 0 0 20px rgba(0, 204, 150, 0.08);
		text-decoration: none;
	}

	.choice-card.recommended {
		border-color: var(--primary-500);
		background: var(--primary-50, rgba(0, 204, 150, 0.03));
	}

	.choice-badge {
		position: absolute;
		top: -8px;
		right: 16px;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 8px;
		background: var(--primary-600, #00cc96);
		color: white;
		border-radius: 4px;
	}

	.choice-icon {
		font-size: 1.75rem;
		display: block;
		margin-bottom: var(--space-2);
	}

	.choice-card h3 {
		font-size: 1.125rem;
		font-weight: 700;
		margin-bottom: var(--space-2);
		color: var(--neutral-800);
	}

	.choice-card p {
		font-size: 0.8125rem;
		color: var(--neutral-500);
		line-height: 1.5;
		margin-bottom: var(--space-3);
	}

	.choice-steps {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--primary-600, #00cc96);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.choice-footer {
		text-align: center;
	}

	.back-link {
		color: var(--neutral-500);
		font-size: 0.875rem;
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--neutral-700);
	}

	.back-to-choice {
		background: none;
		border: none;
		color: var(--neutral-500);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: 0;
		margin-bottom: var(--space-2);
	}

	.back-to-choice:hover {
		color: var(--neutral-700);
	}

	@media (max-width: 640px) {
		.choice-grid { grid-template-columns: 1fr; }
	}
</style>
