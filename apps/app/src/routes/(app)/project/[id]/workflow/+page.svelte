<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	let saving = $state(false);

	// Workflow config — stored in project state.aiContext
	let evaluationMode = $state(
		(data.project.state?.aiContext?.evaluationMode as string) ?? 'collaborative'
	);
	let aiAssist = $state(
		(data.project.state?.aiContext?.aiAssist as boolean) ?? true
	);

	async function saveAndContinue() {
		saving = true;

		const newState = {
			...data.project.state,
			aiContext: {
				...data.project.state?.aiContext,
				evaluationMode,
				aiAssist
			}
		};

		await supabase
			.from('projects')
			.update({
				state: newState,
				current_step: 'materials',
				updated_at: new Date().toISOString()
			})
			.eq('id', data.project.id);

		goto(`/project/${data.project.id}/materials`);
	}
</script>

<svelte:head>
	<title>Workflow — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-workflow">
	<h2>Choose your workflow</h2>
	<p class="step-description">How would you like to run this evaluation?</p>

	<div class="option-cards">
		<Card>
			<label class="workflow-option" class:selected={evaluationMode === 'collaborative'}>
				<input type="radio" name="mode" value="collaborative" bind:group={evaluationMode} />
				<div class="option-content">
					<h3>Collaborative</h3>
					<p>Invite team members to score vendors independently, then aggregate results.</p>
				</div>
			</label>
		</Card>

		<Card>
			<label class="workflow-option" class:selected={evaluationMode === 'solo'}>
				<input type="radio" name="mode" value="solo" bind:group={evaluationMode} />
				<div class="option-content">
					<h3>Solo</h3>
					<p>Score all vendors yourself. Great for quick evaluations or initial research.</p>
				</div>
			</label>
		</Card>

		<Card>
			<label class="workflow-option" class:selected={evaluationMode === 'ai_assisted'}>
				<input type="radio" name="mode" value="ai_assisted" bind:group={evaluationMode} />
				<div class="option-content">
					<h3>AI-Assisted</h3>
					<p>AI provides preliminary scores based on available data. You review and adjust.</p>
				</div>
			</label>
		</Card>
	</div>

	<Card>
		<label class="toggle-row">
			<span>
				<strong>AI Recommendations</strong>
				<span class="toggle-desc">Let AI suggest scores and flag missing data as you evaluate.</span>
			</span>
			<input type="checkbox" bind:checked={aiAssist} />
		</label>
	</Card>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${data.project.id}/criteria`)}>
			← Back
		</Button>
		<Button variant="primary" onclick={saveAndContinue} loading={saving}>
			Continue to Materials →
		</Button>
	</div>
</div>

<style>
	.step-workflow h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }

	.option-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.workflow-option {
		display: flex;
		gap: var(--space-3);
		cursor: pointer;
		padding: var(--space-1);
	}

	.workflow-option input { margin-top: 2px; }

	.workflow-option h3 {
		font-size: 1rem;
		margin-bottom: var(--space-1);
	}

	.workflow-option p {
		font-size: 0.8125rem;
		color: var(--neutral-500);
		margin: 0;
	}

	.toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
	}

	.toggle-desc {
		display: block;
		font-size: 0.8125rem;
		color: var(--neutral-500);
		margin-top: 2px;
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-5);
	}
</style>
