<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let name = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleCreate(e?: Event) {
		e?.preventDefault();
		if (!name.trim()) {
			error = 'Give your SCOPE a name';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/scopes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim() }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				error = data.message ?? 'Failed to create SCOPE session';
				loading = false;
				return;
			}

			const data = await res.json();
			goto(`/scope/${data.scope.id}/signal`);
		} catch {
			error = 'Something went wrong';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>New SCOPE — Shortlist</title>
</svelte:head>

<div class="new-scope">
	<header class="page-header">
		<h1>Start a new SCOPE</h1>
		<p>Diagnose the problem before jumping to solutions. SCOPE helps your team decide whether to buy, build, fix, or do nothing.</p>
	</header>

	<Card>
		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleCreate(e); }}>
			<label class="field">
				<span>What are you investigating? <em>*</em></span>
				<input
					type="text"
					bind:value={name}
					placeholder="e.g., CRM Replacement Decision, Marketing Automation Need"
					required
					maxlength="120"
				/>
				<span class="field-hint">Give it a name your team will recognize.</span>
			</label>

			<div class="scope-preview">
				<h3>What happens next</h3>
				<div class="steps-preview">
					<div class="preview-step"><strong>S</strong>ignal — What triggered this?</div>
					<div class="preview-step"><strong>C</strong>ause — Why is this happening?</div>
					<div class="preview-step"><strong>O</strong>ptions — What are your options?</div>
					<div class="preview-step"><strong>P</strong>repare — Are you ready?</div>
					<div class="preview-step"><strong>E</strong>ndorse — Get the green light.</div>
				</div>
			</div>

			<div class="actions">
				<Button variant="ghost" type="button" onclick={() => goto('/project/new')}>
					Back
				</Button>
				<Button variant="primary" type="submit" {loading}>
					Start SCOPE
				</Button>
			</div>
		</form>
	</Card>
</div>

<style>
	.new-scope {
		max-width: 640px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin-bottom: 0; }

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
	}

	.field span {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--space-2);
		color: var(--neutral-700);
	}

	.field em { color: #dc2626; font-style: normal; }

	.field input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-family: inherit;
	}

	.field input:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.field-hint {
		font-size: 0.75rem !important;
		color: var(--neutral-400) !important;
		font-weight: 400 !important;
		margin-top: var(--space-1);
	}

	.scope-preview {
		background: var(--neutral-50, #f8fafc);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		padding: var(--space-4);
		margin-bottom: var(--space-5);
	}

	.scope-preview h3 {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--neutral-600);
		margin-bottom: var(--space-3);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.steps-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.preview-step {
		font-size: 0.875rem;
		color: var(--neutral-600);
		padding-left: var(--space-2);
		border-left: 2px solid var(--neutral-200);
	}

	.preview-step strong {
		color: var(--primary-600, #4f46e5);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}
</style>
