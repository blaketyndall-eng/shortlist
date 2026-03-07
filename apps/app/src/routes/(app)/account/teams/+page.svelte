<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';
	import Modal from '$components/ui/Modal.svelte';

	let { data } = $props();

	let showCreateModal = $state(false);
	let showInviteModal = $state(false);
	let inviteTeamId = $state('');
	let newTeamName = $state('');
	let inviteEmail = $state('');
	let inviteRole = $state<'member' | 'admin'>('member');
	let loading = $state(false);
	let message = $state('');

	async function createTeam() {
		if (!newTeamName.trim()) return;
		loading = true;
		message = '';

		const res = await fetch('/api/teams', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newTeamName.trim() })
		});

		if (res.ok) {
			message = 'Team created!';
			showCreateModal = false;
			newTeamName = '';
			window.location.reload();
		} else {
			const err = await res.json();
			message = `Error: ${err.message}`;
		}
		loading = false;
	}

	async function inviteMember() {
		if (!inviteEmail.trim()) return;
		loading = true;
		message = '';

		const res = await fetch('/api/teams/invite', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				teamId: inviteTeamId,
				email: inviteEmail.trim(),
				role: inviteRole
			})
		});

		if (res.ok) {
			message = 'Invitation sent!';
			showInviteModal = false;
			inviteEmail = '';
			window.location.reload();
		} else {
			const err = await res.json();
			message = `Error: ${err.message}`;
		}
		loading = false;
	}

	function openInvite(teamId: string) {
		inviteTeamId = teamId;
		inviteEmail = '';
		inviteRole = 'member';
		showInviteModal = true;
	}

	function roleColor(role: string): string {
		if (role === 'admin') return 'var(--primary-600)';
		if (role === 'leadership') return 'var(--accent, #e6a817)';
		return 'var(--neutral-400)';
	}
</script>

<svelte:head>
	<title>Teams — Shortlist</title>
</svelte:head>

<div class="teams-page">
	<header class="page-header">
		<div class="header-row">
			<div>
				<h1>Teams</h1>
				<p>Manage your teams and invite collaborators.</p>
			</div>
			<Button variant="primary" onclick={() => (showCreateModal = true)}>+ New Team</Button>
		</div>
	</header>

	{#if message}
		<div class="message" class:error={message.startsWith('Error')}>{message}</div>
	{/if}

	{#if data.teams.length === 0}
		<Card>
			<div class="empty-state">
				<p>You haven't joined any teams yet.</p>
				<Button variant="primary" onclick={() => (showCreateModal = true)}>Create Your First Team</Button>
			</div>
		</Card>
	{:else}
		{#each data.teams as team (team.id)}
			<Card>
				<div class="team-header">
					<div>
						<h3>{team.name}</h3>
						<span class="team-meta">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
					</div>
					{#if team.userRole === 'admin'}
						<Button variant="secondary" size="sm" onclick={() => openInvite(team.id)}>
							Invite Member
						</Button>
					{/if}
				</div>

				<div class="members-list">
					{#each team.members as member (member.id)}
						<div class="member-row">
							<div class="member-avatar">
								{member.name?.charAt(0)?.toUpperCase() ?? '?'}
							</div>
							<div class="member-info">
								<span class="member-name">
									{member.name ?? 'Unknown'}
									{#if member.user_id === data.userId}
										<span class="you-badge">you</span>
									{/if}
								</span>
								<span class="member-detail">
									{#if member.title}
										{member.title}
									{/if}
									{#if member.title && member.department}
										·
									{/if}
									{#if member.department}
										{member.department}
									{/if}
								</span>
								<span class="member-email">{member.email}</span>
							</div>
							<span class="member-role" style="color: {roleColor(member.role)}">{member.role}</span>
						</div>
					{/each}
				</div>
			</Card>
		{/each}
	{/if}
</div>

{#if showCreateModal}
	<Modal title="Create Team" onclose={() => (showCreateModal = false)}>
		<form class="modal-form" onsubmit={(e) => { e.preventDefault(); createTeam(); }}>
			<div class="form-group">
				<label for="teamName">Team Name</label>
				<input id="teamName" type="text" bind:value={newTeamName} placeholder="e.g., Evaluation Team" autofocus />
			</div>
			<div class="modal-actions">
				<Button variant="secondary" onclick={() => (showCreateModal = false)}>Cancel</Button>
				<Button variant="primary" type="submit" loading={loading}>Create Team</Button>
			</div>
		</form>
	</Modal>
{/if}

{#if showInviteModal}
	<Modal title="Invite Team Member" onclose={() => (showInviteModal = false)}>
		<form class="modal-form" onsubmit={(e) => { e.preventDefault(); inviteMember(); }}>
			<div class="form-group">
				<label for="inviteEmail">Email Address</label>
				<input id="inviteEmail" type="email" bind:value={inviteEmail} placeholder="colleague@company.com" autofocus />
			</div>
			<div class="form-group">
				<label for="inviteRole">Role</label>
				<select id="inviteRole" bind:value={inviteRole}>
					<option value="member">Member</option>
					<option value="admin">Admin</option>
				</select>
			</div>
			<div class="modal-actions">
				<Button variant="secondary" onclick={() => (showInviteModal = false)}>Cancel</Button>
				<Button variant="primary" type="submit" loading={loading}>Send Invite</Button>
			</div>
		</form>
	</Modal>
{/if}

<style>
	.teams-page {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header { margin-bottom: var(--space-5); }
	.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin-bottom: 0; }

	.message {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		margin-bottom: var(--space-4);
		background: var(--primary-50);
		color: var(--primary-700);
	}

	.message.error { background: #fef2f2; color: #dc2626; }

	h3 { font-size: 1rem; margin-bottom: 0; }

	.team-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.team-meta {
		font-size: 0.75rem;
		color: var(--neutral-400);
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--neutral-50);
	}

	.member-row:last-child { border-bottom: none; }

	.member-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--primary-100);
		color: var(--primary-700);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.member-info { flex: 1; min-width: 0; }

	.member-name {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--neutral-800);
	}

	.you-badge {
		font-size: 0.625rem;
		background: var(--primary-100);
		color: var(--primary-600);
		padding: 1px 6px;
		border-radius: 9999px;
		font-weight: 600;
		margin-left: 4px;
		vertical-align: middle;
	}

	.member-detail {
		display: block;
		font-size: 0.75rem;
		color: var(--neutral-500);
		margin-top: 1px;
	}

	.member-email {
		display: block;
		font-size: 0.6875rem;
		color: var(--neutral-400);
	}

	.member-role {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
		flex-shrink: 0;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-6);
		color: var(--neutral-400);
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

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
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px var(--primary-100);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		padding-top: var(--space-2);
	}
</style>
