<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();

	let step = $state<'welcome' | 'profile' | 'team' | 'first_project'>('welcome');
	let fullName = $state(data.profile?.full_name ?? '');
	let company = $state(data.profile?.company ?? '');
	let jobTitle = $state('');
	let saving = $state(false);
	let inviteEmail = $state('');
	let inviteSending = $state(false);
	let inviteSent = $state(false);

	async function saveProfile() {
		saving = true;

		const { data: user } = await supabase.auth.getUser();
		if (!user.user) return;

		await supabase
			.from('profiles')
			.update({
				full_name: fullName.trim(),
				company: company.trim() || null,
				job_title: jobTitle.trim() || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', user.user.id);

		await supabase.from('user_onboarding').upsert({
			user_id: user.user.id,
			step: 'team',
			completed_steps: ['welcome', 'profile'],
			updated_at: new Date().toISOString()
		});

		step = 'team';
		saving = false;
	}

	async function sendInvite() {
		if (!inviteEmail.includes('@')) return;
		inviteSending = true;

		const { data: user } = await supabase.auth.getUser();
		if (!user.user) {
			inviteSending = false;
			return;
		}

		// Check if user has a team, create one if not
		const { data: memberOf } = await supabase
			.from('team_members')
			.select('team_id')
			.eq('user_id', user.user.id)
			.limit(1);

		let teamId: string;

		if (memberOf && memberOf.length > 0) {
			teamId = memberOf[0].team_id;
		} else {
			// Create a default team
			const teamName = company.trim() ? `${company.trim()} Team` : `${fullName.trim()}'s Team`;
			const { data: newTeam } = await supabase
				.from('teams')
				.insert({ name: teamName, created_by: user.user.id })
				.select('id')
				.single();

			if (!newTeam) { inviteSending = false; return; }
			teamId = newTeam.id;

			// Add self as admin
			await supabase.from('team_members').insert({
				team_id: teamId,
				user_id: user.user.id,
				role: 'admin'
			});
		}

		// Create invite (even if user doesn't exist yet, record the invitation)
		await supabase.from('team_invitations').insert({
			team_id: teamId,
			email: inviteEmail.trim(),
			invited_by: user.user.id,
			status: 'pending'
		});

		inviteSent = true;
		inviteEmail = '';
		inviteSending = false;
	}

	async function skipTeam() {
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) return;

		await supabase.from('user_onboarding').upsert({
			user_id: user.user.id,
			step: 'first_project',
			completed_steps: ['welcome', 'profile', 'team'],
			updated_at: new Date().toISOString()
		});

		step = 'first_project';
	}

	async function finishOnboarding() {
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) return;

		await supabase
			.from('profiles')
			.update({ onboarding_completed: true, updated_at: new Date().toISOString() })
			.eq('id', user.user.id);

		await supabase.from('user_onboarding').upsert({
			user_id: user.user.id,
			step: 'complete',
			completed_steps: ['welcome', 'profile', 'team', 'first_project'],
			completed_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});

		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Welcome — Shortlist</title>
</svelte:head>

<div class="onboarding">
	{#if step === 'welcome'}
		<div class="step-content">
			<h1>Welcome to Shortlist</h1>
			<p>Let's get you set up in 2 minutes. Shortlist helps you evaluate vendors, score proposals, and make better procurement decisions with AI.</p>
			<Button variant="primary" onclick={() => (step = 'profile')}>Get Started</Button>
		</div>

	{:else if step === 'profile'}
		<div class="step-content">
			<h2>Tell us about yourself</h2>
			<Card>
				<form onsubmit={saveProfile}>
					<label class="field">
						<span>Full name</span>
						<input type="text" bind:value={fullName} placeholder="Jane Smith" required />
					</label>
					<label class="field">
						<span>Company</span>
						<input type="text" bind:value={company} placeholder="Acme Corp" />
					</label>
					<label class="field">
						<span>Job title</span>
						<input type="text" bind:value={jobTitle} placeholder="VP of Procurement" />
					</label>
					<Button variant="primary" type="submit" loading={saving}>Continue</Button>
				</form>
			</Card>
		</div>

	{:else if step === 'team'}
		<div class="step-content">
			<h2>Invite your team</h2>
			<p>Procurement decisions are better together. Invite colleagues to collaborate on evaluations.</p>
			<Card>
				<div class="invite-form">
					<input type="email" bind:value={inviteEmail} placeholder="colleague@company.com" />
					<Button variant="secondary" size="sm" onclick={sendInvite} disabled={!inviteEmail.includes('@') || inviteSending}>
						{inviteSending ? 'Sending...' : 'Invite'}
					</Button>
				</div>
				{#if inviteSent}
					<p class="invite-success">Invitation sent! They'll receive an email to join your team.</p>
				{/if}
				<p class="invite-hint">You can always invite more people later from Settings → Teams.</p>
			</Card>
			<div class="step-actions">
				<Button variant="ghost" onclick={skipTeam}>Skip for now</Button>
				<Button variant="primary" onclick={skipTeam}>Continue</Button>
			</div>
		</div>

	{:else if step === 'first_project'}
		<div class="step-content">
			<h2>You're all set!</h2>
			<p>Ready to create your first procurement evaluation?</p>
			<div class="final-actions">
				<Button variant="primary" onclick={() => goto('/project/new')}>
					Create First Project
				</Button>
				<Button variant="ghost" onclick={finishOnboarding}>
					Go to Dashboard
				</Button>
			</div>
		</div>
	{/if}

	<!-- Progress dots -->
	<div class="progress-dots">
		{#each ['welcome', 'profile', 'team', 'first_project'] as s}
			<span class="dot" class:active={s === step} class:completed={
				['welcome', 'profile', 'team', 'first_project'].indexOf(s) <
				['welcome', 'profile', 'team', 'first_project'].indexOf(step)
			}></span>
		{/each}
	</div>
</div>

<style>
	.onboarding {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		padding: var(--space-6);
	}

	.step-content {
		max-width: 480px;
		text-align: center;
		width: 100%;
	}

	.step-content h1 {
		font-size: 2rem;
		margin-bottom: var(--space-3);
	}

	.step-content h2 {
		font-size: 1.5rem;
		margin-bottom: var(--space-2);
	}

	.step-content p {
		color: var(--neutral-500);
		margin-bottom: var(--space-5);
	}

	.field {
		display: block;
		margin-bottom: var(--space-4);
		text-align: left;
	}

	.field span {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--space-1);
		color: var(--neutral-700);
	}

	.field input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}

	.field input:focus {
		outline: var(--focus-ring);
		border-color: var(--primary-500);
	}

	.team-placeholder {
		text-align: center;
		color: var(--neutral-400);
		font-size: 0.875rem;
	}

	.invite-form { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
	.invite-form input {
		flex: 1; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md); font-size: 0.9375rem;
	}
	.invite-form input:focus { outline: var(--focus-ring); border-color: var(--primary-500); }
	.invite-success { color: var(--success-600, #16a34a); font-size: 0.875rem; margin-bottom: var(--space-2); }
	.invite-hint { font-size: 0.75rem; color: var(--neutral-400); }

	.step-actions, .final-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.progress-dots {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-8);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--neutral-300);
		transition: all var(--transition-fast);
	}

	.dot.active {
		background: var(--primary-600);
		width: 24px;
		border-radius: 4px;
	}

	.dot.completed {
		background: var(--primary-300);
	}
</style>
