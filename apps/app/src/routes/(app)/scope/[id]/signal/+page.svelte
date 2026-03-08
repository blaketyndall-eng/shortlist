<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const scopeId = $page.params.id;
	let scope = $state<any>(null);
	let saving = $state(false);

	let trigger = $state('');
	let urgency = $state(3);
	let impactedUsersText = $state('');
	let businessImpact = $state('');

	onMount(async () => {
		const res = await fetch(`/api/scopes/${scopeId}`);
		if (res.ok) {
			scope = await res.json();
			const s = scope.data?.signal;
			if (s) {
				trigger = s.trigger ?? '';
				urgency = s.urgency ?? 3;
				impactedUsersText = (s.impactedUsers ?? []).join(', ');
				businessImpact = s.businessImpact ?? '';
			}
		}
	});

	async function saveAndContinue() {
		saving = true;
		const signalData = {
			trigger: trigger.trim(),
			urgency,
			impactedUsers: impactedUsersText.split(',').map((s: string) => s.trim()).filter(Boolean),
			businessImpact: businessImpact.trim(),
		};

		await fetch(`/api/scopes/${scopeId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				data: { ...scope?.data, signal: signalData },
				current_step: 'cause',
			}),
		});

		goto(`/scope/${scopeId}/cause`);
	}
</script>

<svelte:head>
	<title>Signal — SCOPE — Shortlist</title>
</svelte:head>

<div class="step-page">
	<h2>Capture the Signal</h2>
	<p class="step-desc">What triggered this? Describe the problem, pain point, or opportunity that started this conversation.</p>

	<div class="form-group">
		<label for="trigger">What's the problem or trigger?</label>
		<textarea id="trigger" bind:value={trigger} rows="4" placeholder="Describe the business problem, pain point, or opportunity..."></textarea>
	</div>

	<div class="form-group">
		<label for="urgency">Urgency Level: {urgency}/5</label>
		<input type="range" id="urgency" min="1" max="5" bind:value={urgency} />
		<div class="urgency-labels">
			<span>Low</span>
			<span>Critical</span>
		</div>
	</div>

	<div class="form-group">
		<label for="impacted">Who's impacted? (comma-separated)</label>
		<input type="text" id="impacted" bind:value={impactedUsersText} placeholder="e.g., Engineering, Security, IT Ops" />
	</div>

	<div class="form-group">
		<label for="impact">Business impact if we do nothing</label>
		<textarea id="impact" bind:value={businessImpact} rows="3" placeholder="What happens if this problem continues unaddressed?"></textarea>
	</div>

	<div class="step-actions">
		<a href="/dashboard" class="btn-ghost">← Dashboard</a>
		<button class="btn-primary" onclick={saveAndContinue} disabled={!trigger.trim() || saving}>
			{saving ? 'Saving...' : 'Continue to Cause →'}
		</button>
	</div>
</div>

<style>
	.step-page h2 { color: var(--text, #e2e8f0); margin-bottom: 0.25rem; }
	.step-desc { color: var(--text-muted, #94a3b8); font-size: 0.875rem; margin-bottom: 1.5rem; }

	.form-group { margin-bottom: 1.25rem; }
	.form-group label {
		display: block; font-size: 0.8125rem; font-weight: 600;
		color: var(--text, #e2e8f0); margin-bottom: 0.4rem;
	}

	textarea, input[type="text"] {
		width: 100%; padding: 0.65rem 0.85rem;
		background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px; color: var(--text, #e2e8f0); font-size: 0.875rem;
		font-family: inherit; resize: vertical;
	}
	textarea:focus, input[type="text"]:focus {
		outline: none; border-color: #00cc96;
		box-shadow: 0 0 0 2px rgba(0, 204, 150, 0.15);
	}
	textarea::placeholder, input::placeholder { color: rgba(255, 255, 255, 0.25); }

	input[type="range"] {
		width: 100%; accent-color: #00cc96;
	}

	.urgency-labels {
		display: flex; justify-content: space-between;
		font-size: 0.6875rem; color: var(--text-muted, #64748b); margin-top: 0.25rem;
	}

	.step-actions {
		display: flex; justify-content: space-between; align-items: center;
		margin-top: 2rem; padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.btn-ghost {
		background: none; border: none; color: var(--text-muted, #94a3b8);
		font-size: 0.875rem; cursor: pointer; text-decoration: none;
	}
	.btn-ghost:hover { color: var(--text, #e2e8f0); text-decoration: none; }

	.btn-primary {
		padding: 0.6rem 1.5rem; background: #00cc96; color: #0a0f1e;
		border: none; border-radius: 8px; font-size: 0.875rem;
		font-weight: 600; cursor: pointer;
	}
	.btn-primary:hover { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
