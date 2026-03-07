import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Get team IDs the user belongs to
	const { data: userMemberships } = await locals.supabase
		.from('team_members')
		.select('team_id, role')
		.eq('user_id', userId);

	if (!userMemberships || userMemberships.length === 0) {
		return { teams: [], userId };
	}

	const teamIds = userMemberships.map((m) => m.team_id);
	const roleMap = new Map(userMemberships.map((m) => [m.team_id, m.role]));

	// Fetch teams
	const { data: teams } = await locals.supabase
		.from('teams')
		.select('id, name, created_at')
		.in('id', teamIds);

	// Fetch all members for those teams
	const { data: allMembers } = await locals.supabase
		.from('team_members')
		.select('id, team_id, user_id, name, email, title, department, role, status')
		.in('team_id', teamIds)
		.order('role', { ascending: true });

	// Group members by team
	const membersByTeam = new Map<string, typeof allMembers>();
	for (const member of allMembers ?? []) {
		const existing = membersByTeam.get(member.team_id) ?? [];
		existing.push(member);
		membersByTeam.set(member.team_id, existing);
	}

	// Combine into team objects with user's role
	const teamsWithMembers = (teams ?? []).map((team) => ({
		...team,
		userRole: roleMap.get(team.id) ?? 'member',
		members: membersByTeam.get(team.id) ?? []
	}));

	return {
		teams: teamsWithMembers,
		userId
	};
};
