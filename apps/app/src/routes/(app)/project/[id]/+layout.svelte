<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import WizardStepper from '$components/layout/WizardStepper.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { data, children } = $props();
	const supabase = createSupabaseBrowserClient();
	let collaborators = $state<string[]>([]);

	// Subscribe to realtime changes on this project
	onMount(() => {
		const channel = supabase
			.channel(`project-${data.project.id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'projects',
					filter: `id=eq.${data.project.id}`
				},
				() => {
					// Refresh data when project is updated by another user
					invalidateAll();
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'activity_log',
					filter: `project_id=eq.${data.project.id}`
				},
				() => {
					invalidateAll();
				}
			)
			.on('presence', { event: 'sync' }, () => {
				const state = channel.presenceState();
				collaborators = Object.values(state)
					.flat()
					.map((p: any) => p.user_name)
					.filter(Boolean);
			})
			.subscribe(async (status) => {
				if (status === 'SUBSCRIBED') {
					await channel.track({
						user_id: data.profile?.id,
						user_name: data.profile?.full_name ?? 'Anonymous',
						online_at: new Date().toISOString()
					});
				}
			});

		return () => {
			supabase.removeChannel(channel);
		};
	});

	const steps = [
		{ key: 'setup', label: 'Setup', href: `/project/${data.project.id}/setup` },
		{ key: 'criteria', label: 'Criteria', href: `/project/${data.project.id}/criteria` },
		{ key: 'workflow', label: 'Workflow', href: `/project/${data.project.id}/workflow` },
		{ key: 'materials', label: 'Materials', href: `/project/${data.project.id}/materials` },
		{ key: 'ratings', label: 'Ratings', href: `/project/${data.project.id}/ratings` },
		{ key: 'results', label: 'Results', href: `/project/${data.project.id}/results` }
	];

	const currentStep = $derived(
		$page.url.pathname.split('/').pop() ?? data.project.current_step ?? 'setup'
	);
</script>

<div class="wizard-layout">
	<header class="wizard-header">
		<div class="wizard-title">
			<a href="/dashboard" class="back-link" aria-label="Back to dashboard">←</a>
			<div>
				<h1>{data.project.name}</h1>
				{#if data.project.category}
					<span class="project-category">{data.project.category}</span>
				{/if}
			</div>
		</div>

		{#if collaborators.length > 0}
			<div class="collaborators">
				{#each collaborators.slice(0, 4) as name (name)}
					<span class="collab-avatar" title={name}>{name.charAt(0).toUpperCase()}</span>
				{/each}
				{#if collaborators.length > 4}
					<span class="collab-more">+{collaborators.length - 4}</span>
				{/if}
				<span class="collab-label">{collaborators.length} online</span>
			</div>
		{/if}

		<WizardStepper {steps} {currentStep} />
	</header>

	<div class="wizard-content">
		{@render children()}
	</div>
</div>

<style>
	.wizard-layout {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-6);
	}

	.wizard-header {
		margin-bottom: var(--space-6);
	}

	.wizard-title {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.back-link {
		font-size: 1.25rem;
		color: var(--neutral-400);
		text-decoration: none;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.back-link:hover {
		background: var(--neutral-100);
		color: var(--neutral-700);
		text-decoration: none;
	}

	.wizard-title h1 {
		font-size: 1.25rem;
		margin-bottom: 0;
	}

	.project-category {
		font-size: 0.75rem;
		color: var(--neutral-500);
		text-transform: capitalize;
	}

	.wizard-content {
		min-height: 400px;
	}

	.collaborators {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-bottom: var(--space-3);
	}

	.collab-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--primary-100);
		color: var(--primary-700);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		font-weight: 700;
		border: 2px solid white;
		margin-left: -6px;
	}

	.collab-avatar:first-child { margin-left: 0; }

	.collab-more {
		font-size: 0.6875rem;
		color: var(--neutral-400);
		font-weight: 600;
		margin-left: var(--space-1);
	}

	.collab-label {
		font-size: 0.6875rem;
		color: var(--success-600, #16a34a);
		margin-left: var(--space-2);
		font-weight: 500;
	}
</style>
