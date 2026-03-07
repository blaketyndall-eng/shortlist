import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Fetch user's projects (via membership)
	const { data: projects } = await locals.supabase
		.from('projects')
		.select(`
			id, name, type, status, category, current_step, state, created_at, updated_at,
			project_members!inner(role)
		`)
		.eq('project_members.user_id', userId)
		.eq('status', 'active')
		.order('updated_at', { ascending: false })
		.limit(20);

	// Fetch team members count — all members across teams the user belongs to
	// First get the user's team IDs, then count all members in those teams
	const { data: userTeams } = await locals.supabase
		.from('team_members')
		.select('team_id')
		.eq('user_id', userId);

	let teamCount = 0;
	if (userTeams && userTeams.length > 0) {
		const teamIds = userTeams.map((t) => t.team_id);
		const { count } = await locals.supabase
			.from('team_members')
			.select('*', { count: 'exact', head: true })
			.in('team_id', teamIds);
		teamCount = count ?? 0;
	}

	// Fetch AI credits used this month
	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	const { data: usage } = await locals.supabase
		.from('ai_usage')
		.select('credits_used')
		.eq('user_id', userId)
		.gte('created_at', startOfMonth.toISOString());

	const totalCredits = usage?.reduce((sum, row) => sum + (row.credits_used ?? 0), 0) ?? 0;

	// Count unique vendors across active projects
	let vendorCount = 0;
	if (projects) {
		const vendorSet = new Set<string>();
		for (const p of projects) {
			const vendors = p.state?.vendors ?? [];
			vendors.forEach((v: any) => vendorSet.add(v.name));
		}
		vendorCount = vendorSet.size;
	}

	// Fetch recent activity across user's projects
	// DB columns are: verb, detail, user_id — map to type, description, user_name for UI
	const projectIds = (projects ?? []).map((p) => p.id);
	let activities: any[] = [];
	if (projectIds.length > 0) {
		const { data: activityData } = await locals.supabase
			.from('activity_log')
			.select('id, verb, detail, user_id, created_at, metadata')
			.in('project_id', projectIds)
			.order('created_at', { ascending: false })
			.limit(15);

		if (activityData && activityData.length > 0) {
			// Resolve user names from profiles
			const userIds = [...new Set(activityData.map((a) => a.user_id).filter(Boolean))];
			const { data: profileData } = await locals.supabase
				.from('profiles')
				.select('id, full_name')
				.in('id', userIds);

			const nameMap = new Map((profileData ?? []).map((p) => [p.id, p.full_name]));

			activities = activityData.map((a) => ({
				id: a.id,
				type: a.verb ?? 'default',
				description: a.detail ?? '',
				user_name: nameMap.get(a.user_id) ?? null,
				created_at: a.created_at,
				metadata: a.metadata
			}));
		}
	}

	return {
		projects: projects ?? [],
		activities,
		stats: {
			activeProjects: projects?.length ?? 0,
			vendorsTracked: vendorCount,
			aiCreditsUsed: totalCredits,
			teamMembers: teamCount ?? 0
		}
	};
};
// Updated 1772866800
