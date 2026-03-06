<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();

	// Profile form state
	let fullName = $state(data.profile?.full_name ?? '');
	let company = $state(data.profile?.company ?? '');
	let jobTitle = $state(data.profile?.job_title ?? '');
	let userType = $state(data.profile?.user_type ?? 'b2b');
	let saving = $state(false);
	let saveMessage = $state('');

	// Password form state
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordMessage = $state('');
	let changingPassword = $state(false);

	// Notification preferences
	let emailDigest = $state(data.notificationPreferences.email_digest);
	let inApp = $state(data.notificationPreferences.in_app);
	let aiUpdates = $state(data.notificationPreferences.ai_updates);
	let teamActivity = $state(data.notificationPreferences.team_activity);

	// Active tab
	let activeTab = $state<'profile' | 'security' | 'notifications' | 'usage'>('profile');

	async function saveProfile() {
		saving = true;
		saveMessage = '';

		const { error } = await supabase
			.from('profiles')
			.update({
				full_name: fullName.trim(),
				company: company.trim() || null,
				job_title: jobTitle.trim() || null,
				user_type: userType
			})
			.eq('id', data.profile?.id);

		if (error) {
			saveMessage = `Error: ${error.message}`;
		} else {
			saveMessage = 'Profile saved';
			await invalidateAll();
		}
		saving = false;
		setTimeout(() => (saveMessage = ''), 3000);
	}

	async function changePassword() {
		if (newPassword.length < 8) {
			passwordMessage = 'Password must be at least 8 characters';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordMessage = 'Passwords do not match';
			return;
		}

		changingPassword = true;
		passwordMessage = '';

		const { error } = await supabase.auth.updateUser({ password: newPassword });

		if (error) {
			passwordMessage = `Error: ${error.message}`;
		} else {
			passwordMessage = 'Password updated';
			newPassword = '';
			confirmPassword = '';
		}
		changingPassword = false;
		setTimeout(() => (passwordMessage = ''), 3000);
	}

	async function saveNotifications() {
		saving = true;
		saveMessage = '';

		const { error } = await supabase
			.from('notification_preferences')
			.upsert({
				user_id: data.profile?.id,
				email_digest: emailDigest,
				in_app: inApp,
				ai_updates: aiUpdates,
				team_activity: teamActivity
			});

		if (error) {
			saveMessage = `Error: ${error.message}`;
		} else {
			saveMessage = 'Notification preferences saved';
		}
		saving = false;
		setTimeout(() => (saveMessage = ''), 3000);
	}

	const tabs = [
		{ id: 'profile' as const, label: 'Profile' },
		{ id: 'security' as const, label: 'Security' },
		{ id: 'notifications' as const, label: 'Notifications' },
		{ id: 'usage' as const, label: 'AI Usage' }
	];
</script>

<svelte:head>
	<title>Account Settings — Shortlist</title>
</svelte:head>

<div class="account-page">
	<header class="page-header">
		<h1>Account Settings</h1>
		<p>Manage your profile, security, and preferences.</p>
	</header>

	<div class="tabs">
		{#each tabs as tab (tab.id)}
			<button
				class="tab"
				class:active={activeTab === tab.id}
				onclick={() => (activeTab = tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'profile'}
		<Card>
			<h3>Profile Information</h3>
			<form class="form" onsubmit={(e) => { e.preventDefault(); saveProfile(); }}>
				<div class="form-group">
					<label for="email">Email</label>
					<input id="email" type="email" value={data.profile?.email ?? ''} disabled />
					<span class="form-hint">Email cannot be changed here.</span>
				</div>
				<div class="form-group">
					<label for="fullName">Full Name</label>
					<input id="fullName" type="text" bind:value={fullName} placeholder="Your name" />
				</div>
				<div class="form-group">
					<label for="company">Company</label>
					<input id="company" type="text" bind:value={company} placeholder="Company name" />
				</div>
				<div class="form-group">
					<label for="jobTitle">Job Title</label>
					<input id="jobTitle" type="text" bind:value={jobTitle} placeholder="Your role" />
				</div>
				<div class="form-group">
					<label for="userType">Account Type</label>
					<select id="userType" bind:value={userType}>
						<option value="b2b">B2B Procurement</option>
						<option value="consumer">Consumer</option>
						<option value="both">Both</option>
					</select>
				</div>

				<div class="form-actions">
					<Button variant="primary" type="submit" loading={saving}>Save Changes</Button>
					{#if saveMessage}
						<span class="form-message" class:error={saveMessage.startsWith('Error')}>{saveMessage}</span>
					{/if}
				</div>
			</form>
		</Card>

		{#if data.teams.length > 0}
			<Card>
				<h3>Your Teams</h3>
				<div class="teams-list">
					{#each data.teams as membership}
						{@const team = membership.teams as any}
						<div class="team-row">
							<span class="team-name">{team?.name}</span>
							<span class="team-role">{membership.role}</span>
						</div>
					{/each}
				</div>
			</Card>
		{/if}

	{:else if activeTab === 'security'}
		<Card>
			<h3>Change Password</h3>
			<form class="form" onsubmit={(e) => { e.preventDefault(); changePassword(); }}>
				<div class="form-group">
					<label for="newPassword">New Password</label>
					<input id="newPassword" type="password" bind:value={newPassword} placeholder="Minimum 8 characters" />
				</div>
				<div class="form-group">
					<label for="confirmPassword">Confirm Password</label>
					<input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="Re-enter password" />
				</div>
				<div class="form-actions">
					<Button variant="primary" type="submit" loading={changingPassword}>Update Password</Button>
					{#if passwordMessage}
						<span class="form-message" class:error={passwordMessage.startsWith('Error') || passwordMessage.startsWith('Password')}>{passwordMessage}</span>
					{/if}
				</div>
			</form>
		</Card>

		<Card>
			<h3>Sessions</h3>
			<p class="section-desc">You are currently signed in. Sign out of all devices to revoke active sessions.</p>
			<Button variant="danger" onclick={async () => { await supabase.auth.signOut({ scope: 'global' }); window.location.href = '/auth/login'; }}>
				Sign out everywhere
			</Button>
		</Card>

	{:else if activeTab === 'notifications'}
		<Card>
			<h3>Notification Preferences</h3>
			<form class="form" onsubmit={(e) => { e.preventDefault(); saveNotifications(); }}>
				<label class="toggle-row">
					<input type="checkbox" bind:checked={emailDigest} />
					<div>
						<span class="toggle-label">Email Digest</span>
						<span class="toggle-desc">Receive a daily summary of project activity.</span>
					</div>
				</label>
				<label class="toggle-row">
					<input type="checkbox" bind:checked={inApp} />
					<div>
						<span class="toggle-label">In-App Notifications</span>
						<span class="toggle-desc">Show notifications within the Shortlist app.</span>
					</div>
				</label>
				<label class="toggle-row">
					<input type="checkbox" bind:checked={aiUpdates} />
					<div>
						<span class="toggle-label">AI Updates</span>
						<span class="toggle-desc">Get notified when AI analysis completes.</span>
					</div>
				</label>
				<label class="toggle-row">
					<input type="checkbox" bind:checked={teamActivity} />
					<div>
						<span class="toggle-label">Team Activity</span>
						<span class="toggle-desc">Alerts when team members score or comment.</span>
					</div>
				</label>

				<div class="form-actions">
					<Button variant="primary" type="submit" loading={saving}>Save Preferences</Button>
					{#if saveMessage}
						<span class="form-message" class:error={saveMessage.startsWith('Error')}>{saveMessage}</span>
					{/if}
				</div>
			</form>
		</Card>

	{:else if activeTab === 'usage'}
		<Card>
			<h3>AI Usage This Month</h3>
			<div class="usage-summary">
				<div class="usage-stat">
					<span class="usage-number">{data.aiUsage.totalCredits}</span>
					<span class="usage-label">Credits Used</span>
				</div>
				<div class="usage-stat">
					<span class="usage-number">{data.aiUsage.breakdown.length}</span>
					<span class="usage-label">API Calls</span>
				</div>
			</div>

			{#if data.aiUsage.breakdown.length > 0}
				<div class="usage-table">
					<div class="usage-header">
						<span>Engine</span>
						<span>Credits</span>
						<span>Date</span>
					</div>
					{#each data.aiUsage.breakdown.slice(0, 20) as row}
						<div class="usage-row">
							<span class="engine-name">{row.engine}</span>
							<span>{row.credits_used}</span>
							<span class="usage-date">{new Date(row.created_at).toLocaleDateString()}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-text">No AI usage this month.</p>
			{/if}
		</Card>
	{/if}
</div>

<style>
	.account-page {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header { margin-bottom: var(--space-5); }
	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin-bottom: 0; }

	.tabs {
		display: flex;
		gap: var(--space-1);
		border-bottom: 1px solid var(--neutral-200);
		margin-bottom: var(--space-5);
	}

	.tab {
		padding: var(--space-2) var(--space-3);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--neutral-500);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.tab:hover { color: var(--neutral-700); }
	.tab.active { color: var(--primary-600); border-bottom-color: var(--primary-600); }

	h3 { font-size: 1rem; margin-bottom: var(--space-4); }

	.form { display: flex; flex-direction: column; gap: var(--space-4); }

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.form-group label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--neutral-700);
	}

	.form-group input,
	.form-group select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		transition: border-color var(--transition-fast);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.form-group input:disabled {
		background: var(--neutral-50);
		color: var(--neutral-400);
	}

	.form-hint {
		font-size: 0.75rem;
		color: var(--neutral-400);
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-top: var(--space-2);
	}

	.form-message {
		font-size: 0.8125rem;
		color: var(--success-600, #16a34a);
		font-weight: 500;
	}

	.form-message.error { color: var(--danger-600, #dc2626); }

	.section-desc {
		font-size: 0.875rem;
		color: var(--neutral-500);
		margin-bottom: var(--space-3);
	}

	.teams-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.team-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) var(--space-3);
		background: var(--neutral-50);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
	}

	.team-name { font-weight: 500; color: var(--neutral-800); }

	.team-role {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--neutral-400);
		font-weight: 600;
	}

	.toggle-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--neutral-100);
		cursor: pointer;
	}

	.toggle-row input[type='checkbox'] { margin-top: 2px; }

	.toggle-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--neutral-800);
	}

	.toggle-desc {
		display: block;
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-top: 2px;
	}

	.usage-summary {
		display: flex;
		gap: var(--space-6);
		margin-bottom: var(--space-5);
	}

	.usage-stat { display: flex; flex-direction: column; }

	.usage-number {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--neutral-900);
	}

	.usage-label {
		font-size: 0.8125rem;
		color: var(--neutral-400);
	}

	.usage-table {
		font-size: 0.8125rem;
	}

	.usage-header, .usage-row {
		display: grid;
		grid-template-columns: 1fr 80px 100px;
		padding: var(--space-2) 0;
	}

	.usage-header {
		font-weight: 600;
		color: var(--neutral-500);
		border-bottom: 1px solid var(--neutral-200);
	}

	.usage-row { border-bottom: 1px solid var(--neutral-50); }

	.engine-name {
		font-weight: 500;
		color: var(--neutral-700);
		text-transform: capitalize;
	}

	.usage-date { color: var(--neutral-400); }

	.empty-text {
		text-align: center;
		color: var(--neutral-400);
		font-size: 0.875rem;
		padding: var(--space-4) 0;
	}
</style>
