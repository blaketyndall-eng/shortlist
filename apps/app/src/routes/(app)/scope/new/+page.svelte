<script lang="ts">
	import { goto } from '$app/navigation';

	let name = $state('');
	let creating = $state(false);

	async function createScope() {
		if (!name.trim() || creating) return;
		creating = true;

		try {
			const res = await fetch('/api/scopes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim() }),
			});
			if (res.ok) {
				const scope = await res.json();
				goto(`/scope/${scope.id}/signal`);
			}
		} catch { /* handled */ }

		creating = false;
	}
</script>

<svelte:head>
	<title>New SCOPE — Shortlist</title>
</svelte:head>

<div class="new-scope">
	<div class="new-scope-card">
		<div class="scope-icon">S</div>
		<h1>Start a SCOPE</h1>
		<p class="scope-desc">
			SCOPE helps you diagnose whether buying software is the right move.
			Walk through Signal → Cause → Options → Prepare → Endorse before committing to a vendor evaluation.
		</p>

		<form onsubmit={(e) => { e.preventDefault(); createScope(); }}>
			<label for="scope-name">What are you evaluating?</label>
			<input
				id="scope-name"
				type="text"
				bind:value={name}
				placeholder="e.g., Endpoint Security Platform Evaluation"
				autofocus
			/>
			<button type="submit" class="btn-primary" disabled={!name.trim() || creating}>
				{creating ? 'Creating...' : 'Start SCOPE →'}
			</button>
		</form>
	</div>
</div>

<style>
	.new-scope {
		max-width: 560px;
		margin: var(--space-8, 2rem) auto;
		padding: 0 var(--space-4, 1rem);
	}

	.new-scope-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		padding: 2.5rem;
		text-align: center;
	}

	.scope-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(0, 204, 150, 0.12);
		color: #00cc96;
		font-size: 1.5rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-4, 1rem);
	}

	h1 {
		font-size: 1.5rem;
		color: var(--text, #e2e8f0);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.scope-desc {
		color: var(--text-muted, #94a3b8);
		font-size: 0.875rem;
		line-height: 1.6;
		margin-bottom: var(--space-6, 1.5rem);
	}

	form { text-align: left; }

	label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text, #e2e8f0);
		margin-bottom: var(--space-2, 0.5rem);
	}

	input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: var(--text, #e2e8f0);
		font-size: 0.9375rem;
		margin-bottom: var(--space-4, 1rem);
	}
	input:focus {
		outline: none;
		border-color: #00cc96;
		box-shadow: 0 0 0 2px rgba(0, 204, 150, 0.15);
	}
	input::placeholder { color: rgba(255, 255, 255, 0.25); }

	.btn-primary {
		width: 100%;
		padding: 0.75rem;
		background: #00cc96;
		color: #0a0f1e;
		border: none;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-primary:hover { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
