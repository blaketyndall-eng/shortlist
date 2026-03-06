<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import FileUpload from '$components/FileUpload.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	let saving = $state(false);
	let notes = $state(data.project.state?.aiContext?.projectNotes ?? '');
	let uploadedFiles = $state(data.project.state?.aiContext?.files ?? []);

	async function saveAndContinue() {
		saving = true;

		const newState = {
			...data.project.state,
			aiContext: {
				...data.project.state?.aiContext,
				projectNotes: notes,
				files: uploadedFiles
			}
		};

		await supabase
			.from('projects')
			.update({
				state: newState,
				current_step: 'ratings',
				updated_at: new Date().toISOString()
			})
			.eq('id', data.project.id);

		goto(`/project/${data.project.id}/ratings`);
	}
</script>

<svelte:head>
	<title>Materials — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-materials">
	<h2>Add reference materials</h2>
	<p class="step-description">
		Upload documents, paste notes, or add links to help inform your evaluation.
		This step is optional — you can skip it and come back later.
	</p>

	<Card>
		<h3>Project Notes</h3>
		<p class="field-hint">Paste relevant information, requirements, or context for this evaluation.</p>
		<textarea
			bind:value={notes}
			rows="8"
			placeholder="e.g., Key requirements from the RFP, budget constraints, integration needs..."
		></textarea>
	</Card>

	<Card>
		<h3>File Uploads</h3>
		<p class="field-hint">Upload RFPs, proposals, spec sheets, or other evaluation materials.</p>
		<FileUpload
			projectId={data.project.id}
			bind:files={uploadedFiles}
		/>
	</Card>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${data.project.id}/workflow`)}>
			← Back
		</Button>
		<div class="right-actions">
			<Button variant="ghost" onclick={saveAndContinue}>
				Skip for now
			</Button>
			<Button variant="primary" onclick={saveAndContinue} loading={saving}>
				Continue to Ratings →
			</Button>
		</div>
	</div>
</div>

<style>
	.step-materials h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }
	.step-materials h3 { margin-bottom: var(--space-1); font-size: 1rem; }
	.field-hint { font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-3); }

	textarea {
		width: 100%;
		padding: var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.9375rem;
		resize: vertical;
		line-height: 1.6;
	}

	textarea:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-5);
	}

	.right-actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
