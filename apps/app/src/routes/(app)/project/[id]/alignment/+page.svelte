<script lang="ts">
	import { goto } from '$app/navigation';
	import AlignmentDashboard from '$lib/components/alignment/AlignmentDashboard.svelte';
	import AlignmentPoll from '$lib/components/alignment/AlignmentPoll.svelte';
	import Button from '$components/ui/Button.svelte';

	let { data } = $props();

	let showCreatePoll = $state(false);
	let newPollTitle = $state('');
	let newPollContext = $state<string>('general');
	let creating = $state(false);

	async function createPoll() {
		if (!newPollTitle.trim()) return;
		creating = true;
		try {
			const res = await fetch('/api/alignment/polls', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId: data.projectId,
					title: newPollTitle,
					contextType: newPollContext,
					pollType: 'likert',
				}),
			});
			if (res.ok) {
				showCreatePoll = false;
				newPollTitle = '';
				// Refresh page
				window.location.reload();
			}
		} catch (e) {
			console.error('Failed to create poll:', e);
		}
		creating = false;
	}
</script>

<svelte:head>
	<title>Team Alignment — Shortlist</title>
</svelte:head>

<div class="alignment-page">
	<div class="page-header">
		<div class="header-left">
			<Button variant="ghost" onclick={() => goto(`/project/${data.projectId}/solve`)}>
				← Back to Solve
			</Button>
			<h1>Team Alignment</h1>
			<p class="subtitle">Track how aligned your team is across vendors, priorities, and decisions.</p>
		</div>
		<Button variant="secondary" onclick={() => showCreatePoll = !showCreatePoll}>
			{showCreatePoll ? 'Cancel' : '+ New Poll'}
		</Button>
	</div>

	{#if showCreatePoll}
		<div class="create-poll-form">
			<input
				type="text"
				placeholder="Poll question (e.g., How aligned are we on vendor direction?)"
				bind:value={newPollTitle}
				class="poll-input"
			/>
			<select bind:value={newPollContext} class="poll-select">
				<option value="general">General</option>
				<option value="vendor_alignment">Vendor Alignment</option>
				<option value="priority_alignment">Priority Alignment</option>
				<option value="challenge_alignment">Challenge Alignment</option>
				<option value="budget_alignment">Budget Alignment</option>
			</select>
			<Button variant="primary" onclick={createPoll} loading={creating}>
				Create Poll
			</Button>
		</div>
	{/if}

	<AlignmentDashboard projectId={data.projectId} />
</div>

<style>
	.alignment-page {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-6);
	}

	.header-left { display: flex; flex-direction: column; gap: var(--space-1); }

	h1 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-heading);
		margin-top: var(--space-2);
	}

	.subtitle {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.create-poll-form {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-5);
	}

	.poll-input {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary, rgba(255,255,255,0.03));
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: 0.875rem;
	}
	.poll-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.poll-select {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary, rgba(255,255,255,0.03));
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: 0.8125rem;
	}
</style>
