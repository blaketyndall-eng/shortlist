<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	interface OnboardingTask {
		id: string;
		title: string;
		description: string;
		icon: string;
		href: string;
		completed: boolean;
		cta: string;
	}

	interface Props {
		hasCompanyProfile: boolean;
		hasTeamInvites: boolean;
		hasProject: boolean;
		profileId: string;
		ondismiss?: () => void;
	}

	let { hasCompanyProfile, hasTeamInvites, hasProject, profileId, ondismiss }: Props = $props();
	const supabase = createSupabaseBrowserClient();

	let dismissed = $state(false);
	let creatingSample = $state(false);

	const tasks = $derived<OnboardingTask[]>([
		{
			id: 'company_profile',
			title: 'Complete your Company Profile',
			description: 'Help our AI tailor recommendations to your organization — industry, size, compliance, and more.',
			icon: 'building',
			href: '/account/company-profile',
			completed: hasCompanyProfile,
			cta: 'Set up profile'
		},
		{
			id: 'invite_team',
			title: 'Invite your team',
			description: 'Purchase decisions are better together. Add colleagues to collaborate on vendor evaluations.',
			icon: 'users',
			href: '/account/teams',
			completed: hasTeamInvites,
			cta: 'Invite teammates'
		},
		{
			id: 'sample_project',
			title: 'Run through a sample project',
			description: 'See how Shortlist works end-to-end with a pre-filled CRM evaluation. Takes about 5 minutes.',
			icon: 'rocket',
			href: '',
			completed: hasProject,
			cta: 'Try sample project'
		}
	]);

	const completedCount = $derived(tasks.filter(t => t.completed).length);
	const totalTasks = $derived(tasks.length);
	const progressPct = $derived(Math.round((completedCount / totalTasks) * 100));
	const allDone = $derived(completedCount === totalTasks);

	async function handleTaskClick(task: OnboardingTask) {
		if (task.completed) {
			// Still let them navigate to completed tasks
			if (task.href) goto(task.href);
			return;
		}

		if (task.id === 'sample_project') {
			await createSampleProject();
		} else {
			goto(task.href);
		}
	}

	async function createSampleProject() {
		creatingSample = true;

		const { data: user } = await supabase.auth.getUser();
		if (!user.user) { creatingSample = false; return; }

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

		// Add user as project member
		await supabase.from('project_members').insert({
			project_id: project.id,
			user_id: user.user.id,
			role: 'owner'
		});

		creatingSample = false;
		goto(`/project/${project.id}/solve/triggers`);
	}

	async function dismissChecklist() {
		dismissed = true;

		// Mark onboarding as fully completed so it won't show again
		await supabase
			.from('profiles')
			.update({ onboarding_completed: true, updated_at: new Date().toISOString() })
			.eq('id', profileId);

		ondismiss?.();
	}
</script>

{#if !dismissed}
	<div class="checklist" class:all-done={allDone}>
		<div class="checklist-header">
			<div class="header-text">
				<h2>{allDone ? 'You\'re all set!' : 'Get started with Shortlist'}</h2>
				<p>{allDone ? 'You\'ve completed all onboarding tasks.' : `Complete these tasks to get the most out of Shortlist.`}</p>
			</div>
			<div class="header-right">
				<div class="progress-ring">
					<svg viewBox="0 0 36 36">
						<circle class="ring-bg" cx="18" cy="18" r="15.5" />
						<circle
							class="ring-fill"
							cx="18" cy="18" r="15.5"
							stroke-dasharray={`${progressPct} 100`}
						/>
					</svg>
					<span class="ring-label">{completedCount}/{totalTasks}</span>
				</div>
			</div>
		</div>

		<div class="task-list">
			{#each tasks as task (task.id)}
				<button
					class="task-row"
					class:completed={task.completed}
					onclick={() => handleTaskClick(task)}
					disabled={task.id === 'sample_project' && creatingSample}
				>
					<div class="task-check">
						{#if task.completed}
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
								<circle cx="10" cy="10" r="10" fill="var(--color-primary, #00cc96)"/>
								<path d="M6 10l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						{:else}
							<div class="check-empty">
								<svg class="task-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
									{#if task.icon === 'building'}
										<rect x="2" y="4" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
										<path d="M5 7h2M9 7h2M5 10h2M9 10h2M7 4V2h2v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
									{:else if task.icon === 'users'}
										<circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/>
										<path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
										<circle cx="12" cy="5.5" r="2" stroke="currentColor" stroke-width="1.3"/>
										<path d="M14.5 13c0-1.8-1.1-3.2-2.5-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
									{:else if task.icon === 'rocket'}
										<path d="M8 14V9M5.5 11.5L8 14l2.5-2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M8 9c0-3 1.5-5.5 4-7-1.5 2.5-2 5-2 7h-4c0-2-.5-4.5-2-7 2.5 1.5 4 4 4 7z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
									{/if}
								</svg>
							</div>
						{/if}
					</div>
					<div class="task-info">
						<span class="task-title">{task.title}</span>
						<span class="task-desc">{task.description}</span>
					</div>
					<span class="task-cta">
						{#if task.completed}
							<span class="completed-label">Done</span>
						{:else if task.id === 'sample_project' && creatingSample}
							Creating...
						{:else}
							{task.cta} <span class="arrow">→</span>
						{/if}
					</span>
				</button>
			{/each}
		</div>

		<div class="checklist-footer">
			{#if allDone}
				<button class="dismiss-btn primary" onclick={dismissChecklist}>
					Go to Dashboard
				</button>
			{:else}
				<button class="dismiss-btn" onclick={dismissChecklist}>
					Skip — I'll explore on my own
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.checklist {
		background: var(--color-bg-secondary, #141b24);
		border: 1px solid var(--color-border, rgba(255,255,255,0.08));
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
	}

	.checklist.all-done {
		border-color: rgba(0, 204, 150, 0.25);
	}

	.checklist-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-5, 1.25rem) var(--space-6, 1.5rem);
		border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.06));
	}

	.header-text h2 {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-text-heading, #e2e8f0);
		margin: 0 0 4px;
	}

	.header-text p {
		font-size: 0.8125rem;
		color: var(--neutral-500, #64748b);
		margin: 0;
	}

	.progress-ring {
		position: relative;
		width: 48px;
		height: 48px;
	}

	.progress-ring svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.ring-bg {
		fill: none;
		stroke: rgba(255,255,255,0.06);
		stroke-width: 3;
	}

	.ring-fill {
		fill: none;
		stroke: var(--color-primary, #00cc96);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dashoffset: 0;
		transition: stroke-dasharray 0.5s ease;
	}

	.ring-label {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text, #e2e8f0);
	}

	.task-list {
		display: flex;
		flex-direction: column;
	}

	.task-row {
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-4, 1rem) var(--space-6, 1.5rem);
		background: none;
		border: none;
		border-bottom: 1px solid rgba(255,255,255,0.04);
		cursor: pointer;
		text-align: left;
		color: inherit;
		transition: background 0.15s;
		width: 100%;
	}

	.task-row:last-child {
		border-bottom: none;
	}

	.task-row:hover:not(:disabled) {
		background: rgba(255,255,255,0.02);
	}

	.task-row:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	.task-row.completed {
		opacity: 0.6;
	}

	.task-check {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.check-empty {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1.5px solid rgba(255,255,255,0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--neutral-500, #64748b);
	}

	.task-info {
		flex: 1;
		min-width: 0;
	}

	.task-title {
		display: block;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-heading, #e2e8f0);
		margin-bottom: 2px;
	}

	.task-row.completed .task-title {
		text-decoration: line-through;
		text-decoration-color: rgba(255,255,255,0.2);
	}

	.task-desc {
		display: block;
		font-size: 0.8125rem;
		color: var(--neutral-500, #64748b);
		line-height: 1.4;
	}

	.task-cta {
		flex-shrink: 0;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-primary, #00cc96);
		white-space: nowrap;
	}

	.completed-label {
		color: var(--neutral-500, #64748b);
	}

	.arrow {
		display: inline-block;
		transition: transform 0.15s;
	}

	.task-row:hover .arrow {
		transform: translateX(2px);
	}

	.checklist-footer {
		padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
		border-top: 1px solid rgba(255,255,255,0.04);
		display: flex;
		justify-content: center;
	}

	.dismiss-btn {
		background: none;
		border: none;
		color: var(--neutral-500, #64748b);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
		transition: color 0.15s;
	}

	.dismiss-btn:hover {
		color: var(--color-text, #e2e8f0);
	}

	.dismiss-btn.primary {
		background: var(--color-primary, #00cc96);
		color: #0b1017;
		border-radius: var(--radius-md, 8px);
		padding: var(--space-2, 0.5rem) var(--space-5, 1.25rem);
		font-weight: 600;
	}

	.dismiss-btn.primary:hover {
		opacity: 0.9;
		color: #0b1017;
	}
</style>
