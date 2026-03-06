import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase, createAdminSupabase } from '$services/supabase.server';

/**
 * POST /api/teams/invite — Invite a user to a team
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { teamId, email, role = 'member' } = body;

	if (!teamId || !email?.trim()) {
		error(400, 'Team ID and email are required');
	}

	const supabase = createServerSupabase(cookies);
	const adminSupabase = createAdminSupabase();

	// Verify caller is admin of this team
	const { data: callerMembership } = await supabase
		.from('team_members')
		.select('role')
		.eq('team_id', teamId)
		.eq('user_id', locals.user.id)
		.single();

	if (!callerMembership || callerMembership.role !== 'admin') {
		error(403, 'Only team admins can invite members');
	}

	// Look up invitee by email in profiles
	const { data: invitee } = await adminSupabase
		.from('profiles')
		.select('id, email, full_name')
		.eq('email', email.trim().toLowerCase())
		.single();

	if (!invitee) {
		error(404, 'No user found with that email. They must sign up first.');
	}

	// Check if already a member
	const { data: existing } = await supabase
		.from('team_members')
		.select('id')
		.eq('team_id', teamId)
		.eq('user_id', invitee.id)
		.single();

	if (existing) {
		error(409, 'User is already a team member');
	}

	// Add to team
	const { error: insertError } = await supabase
		.from('team_members')
		.insert({
			team_id: teamId,
			user_id: invitee.id,
			role: role === 'admin' ? 'admin' : 'member'
		});

	if (insertError) {
		error(500, insertError.message);
	}

	// Send notification
	await supabase.from('notifications').insert({
		user_id: invitee.id,
		type: 'team_invite',
		title: 'Team Invitation',
		body: `You've been added to a team by ${locals.profile?.full_name ?? 'a teammate'}.`,
		metadata: { team_id: teamId, invited_by: locals.user.id }
	});

	return json({
		success: true,
		member: {
			id: invitee.id,
			email: invitee.email,
			full_name: invitee.full_name,
			role
		}
	});
};
