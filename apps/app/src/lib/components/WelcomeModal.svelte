<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Modal from '$components/ui/Modal.svelte';
	import Button from '$components/ui/Button.svelte';

	interface Props {
		open?: boolean;
		profileId: string;
		onclose?: () => void;
	}

	let { open = $bindable(true), profileId, onclose }: Props = $props();
	const supabase = createSupabaseBrowserClient();

	let creatingSample = $state(false);

	async function dismissWelcome() {
		// Mark onboarding completed so modal won't show again
		await supabase
			.from('profiles')
			.update({ onboarding_completed: true, updated_at: new Date().toISOString() })
			.eq('id', profileId);

		open = false;
		onclose?.();
	}

	async function createSampleProject() {
		creatingSample = true;

		const { data: user } = await supabase.auth.getUser();
		if (!user.user) { creatingSample = false; return; }

		// Create a sample project with pre-filled data
		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				name: 'CRM Platform Evaluation (Sample)',
				description: 'A sample project to help you explore how Shortlist works. Feel free to edit or delete this anytime.',
				category: 'software',
				type: 'evaluate',
				status: 'active',
				current_step: 'triggers',
				phase: 'define',
				owner_id: user.user.id,
				created_by: user.user.id,
				state: {
					vendors: [],
					criteria: [],
					weights: {},
					scores: {},
					aiContext: {}
				},
				solve_data: {
					triggers: {
						painPoints: [
							'Current CRM has poor reporting capabilities',
							'Sales team spending too much time on manual data entry',
							'No integration with our marketing tools'
						],
						urgency: 'medium',
						timeline: '3 months'
					},
					completedSteps: ['triggers']
				}
			})
			.select()
			.single();

		if (error) {
			creatingSample = false;
			return;
		}

		// Mark onboarding as completed
		await supabase
			.from('profiles')
			.update({ onboarding_completed: true, updated_at: new Date().toISOString() })
			.eq('id', profileId);

		open = false;
		goto(`/project/${project.id}/solve/triggers`);
	}

	async function startFresh() {
		await dismissWelcome();
		goto('/project/new');
	}
</script>

<Modal bind:open onclose={dismissWelcome}>
	<div class="welcome">
		<div class="welcome-icon">
			<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
				<circle cx="24" cy="24" r="24" fill="rgba(0, 204, 150, 0.1)"/>
				<path d="M16 24l5 5 11-11" stroke="#00cc96" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>

		<h2>Welcome to Shortlist</h2>
		<p class="welcome-desc">
			Shortlist helps your team discover, evaluate, and select the right vendors — powered by AI.
			Here's the quickest way to get started:
		</p>

		<div class="options">
			<button class="option-card" onclick={createSampleProject} disabled={creatingSample}>
				<span class="option-badge">Recommended</span>
				<span class="option-icon">🧪</span>
				<span class="option-title">Explore a sample project</span>
				<span class="option-desc">See a pre-filled CRM evaluation with real data so you can learn the workflow before building your own.</span>
				{#if creatingSample}
					<span class="option-loading">Creating...</span>
				{/if}
			</button>

			<button class="option-card" onclick={startFresh}>
				<span class="option-icon">🚀</span>
				<span class="option-title">Start a new project</span>
				<span class="option-desc">Jump straight in and create your first vendor evaluation from scratch.</span>
			</button>
		</div>

		<button class="skip-link" onclick={dismissWelcome}>
			Skip — I'll explore on my own
		</button>
	</div>
</Modal>

<style>
	.welcome {
		text-align: center;
	}

	.welcome-icon {
		margin-bottom: var(--space-3);
	}

	.welcome h2 {
		font-size: 1.375rem;
		font-weight: 700;
		margin: 0 0 var(--space-2);
	}

	.welcome-desc {
		font-size: 0.9375rem;
		color: var(--neutral-500);
		line-height: 1.6;
		margin: 0 0 var(--space-5);
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.option-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		padding: var(--space-4);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		background: var(--color-bg-primary);
		cursor: pointer;
		transition: all var(--transition-fast);
		position: relative;
	}

	.option-card:hover {
		border-color: var(--primary-400);
		background: rgba(0, 204, 150, 0.03);
	}

	.option-card:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	.option-badge {
		position: absolute;
		top: -8px;
		right: 12px;
		background: var(--primary-600);
		color: white;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 9999px;
		letter-spacing: 0.02em;
	}

	.option-icon {
		font-size: 1.25rem;
		margin-bottom: var(--space-1);
	}

	.option-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--neutral-800);
		margin-bottom: 4px;
	}

	.option-desc {
		font-size: 0.8125rem;
		color: var(--neutral-500);
		line-height: 1.5;
	}

	.option-loading {
		font-size: 0.75rem;
		color: var(--primary-600);
		margin-top: var(--space-1);
	}

	.skip-link {
		background: none;
		border: none;
		color: var(--neutral-400);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: var(--space-1);
		transition: color var(--transition-fast);
	}

	.skip-link:hover {
		color: var(--neutral-600);
	}
</style>
