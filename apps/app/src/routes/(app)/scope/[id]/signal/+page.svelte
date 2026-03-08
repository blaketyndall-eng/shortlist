<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	const scopeId = $derived($page.params.id);

	let trigger = $state('');
	let urgency = $state(3);
	let impactedUsersText = $state('');
	let businessImpact = $state('');
	let saving = $state(false);
	let error = $state('');

	const urgencyLabels = ['', 'Low', 'Medium', 'High', 'Critical', 'Emergency'];

	onMount(async () => {
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) {
				const data = await res.json();
				const signal = data.scope?.data?.signal;
				if (signal) {
					trigger = signal.trigger ?? '';
					urgency = signal.urgency ?? 3;
					impactedUsersText = (signal.impactedUsers ?? []).join(', ');
					businessImpact = signal.businessImpact ?? '';
				}
			}
		} catch { /* use defaults */ }
	});

	async function handleSave() {
		if (!trigger.trim()) {
			error = 'Describe what triggered this investigation';
			return;
		}

		saving = true;
		error = '';

		try {
			// Load current scope data
			const getRes = await fetch(`/api/scopes/${scopeId}`);
			if (!getRes.ok) { error = 'Failed to load scope'; saving = false; return; }
			const { scope } = await getRes.json();

			const newSignal = {
				trigger: trigger.trim(),
				urgency,
				impactedUsers: impactedUsersText.split(',').map((s: string) => s.trim()).filter(Boolean),
				businessImpact: businessImpact.trim(),
			};

			// Invalidate downstream if signal data changed materially (Pillar 4)
			const oldSignal = scope.data?.signal;
			const signalChanged = oldSignal && (
				oldSignal.trigger !== newSignal.trigger ||
				oldSignal.urgency !== newSignal.urgency ||
				oldSignal.businessImpact !== newSignal.businessImpact
			);

			const updatedData = {
				...scope.data,
				signal: newSignal,
				...(signalChanged ? {
					cause: { ...(scope.data?.cause ?? {}), _stale: true },
					options: { ...(scope.data?.options ?? {}), _stale: true },
					prepare: { ...(scope.data?.prepare ?? {}), _stale: true },
					endorse: { ...(scope.data?.endorse ?? {}), _stale: true },
				} : {}),
			};

			const res = await fetch(`/api/scopes/${scopeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					data: updatedData,
					current_step: 'cause',
				}),
			});

			if (!res.ok) {
				error = 'Failed to save';
				saving = false;
				return;
			}

			goto(`/scope/${scopeId}/cause`);
		} catch {
			error = 'Something went wrong';
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Signal — SCOPE</title>
</svelte:head>

<Card>
	<div class="step-content">
		<h2>What triggered this?</h2>
		<p class="step-intro">Describe the event, pain point, or request that started this investigation. Be specific — good diagnosis starts with a clear signal.</p>

		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<label class="field">
			<span>Trigger description <em>*</em></span>
			<textarea
				bind:value={trigger}
				placeholder="e.g., Sales team spent 3 hours/week manually updating spreadsheets after losing a deal due to outdated pipeline data..."
				rows="4"
			></textarea>
		</label>

		<label class="field">
			<span>Urgency</span>
			<div class="urgency-slider">
				<input type="range" min="1" max="5" step="1" bind:value={urgency} />
				<div class="urgency-labels">
					{#each [1, 2, 3, 4, 5] as level}
						<span class:active={urgency === level}>{urgencyLabels[level]}</span>
					{/each}
				</div>
			</div>
		</label>

		<label class="field">
			<span>Who's affected?</span>
			<input
				type="text"
				bind:value={impactedUsersText}
				placeholder="e.g., Sales team, Account Managers, RevOps"
			/>
			<span class="field-hint">Comma-separated roles, teams, or departments.</span>
		</label>

		<label class="field">
			<span>Business impact</span>
			<textarea
				bind:value={businessImpact}
				placeholder="e.g., Estimated $200K in lost deals per quarter due to poor pipeline visibility. Team morale declining."
				rows="3"
			></textarea>
		</label>

		<div class="actions">
			<Button variant="ghost" type="button" onclick={() => goto('/dashboard')}>
				Cancel
			</Button>
			<Button variant="primary" loading={saving} onclick={handleSave}>
				Save & Continue
			</Button>
		</div>
	</div>
</Card>

<style>
	.step-content h2 { margin-bottom: var(--space-1); }
	.step-intro { color: var(--neutral-500); font-size: 0.875rem; margin-bottom: var(--space-5); }

	.error-banner {
		background: rgba(240, 80, 80, 0.1); color: #f05050;
		padding: var(--space-3); border-radius: var(--radius-md);
		margin-bottom: var(--space-4); font-size: 0.875rem;
	}

	.field { display: block; margin-bottom: var(--space-5); }
	.field span { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: var(--space-2); color: var(--neutral-700); }
	.field em { color: #dc2626; font-style: normal; }
	.field input, .field textarea {
		width: 100%; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md);
		font-size: 0.9375rem; font-family: inherit; resize: vertical;
	}
	.field input:focus, .field textarea:focus {
		outline: var(--focus-ring); outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}
	.field-hint { font-size: 0.75rem !important; color: var(--neutral-400) !important; font-weight: 400 !important; margin-top: var(--space-1); }

	.urgency-slider { padding: var(--space-2) 0; }
	.urgency-slider input[type="range"] { width: 100%; }
	.urgency-labels {
		display: flex; justify-content: space-between;
		font-size: 0.6875rem; color: var(--neutral-400); margin-top: var(--space-1);
	}
	.urgency-labels span.active { color: var(--primary-600); font-weight: 600; }

	.actions {
		display: flex; justify-content: flex-end; gap: var(--space-3);
		padding-top: var(--space-4); border-top: 1px solid var(--neutral-100);
	}
</style>
