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

	// Fetch team members count
	const { count: teamCount } = await locals.supabase
		.from('team_members')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId);

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
	const projectIds = (projects ?? []).map((p) => p.id);
	let activities: any[] = [];
	if (projectIds.length > 0) {
		const { data: activityData } = await locals.supabase
			.from('activity_log')
			.select('id, type, description, user_name, created_at, metadata')
			.in('project_id', projectIds)
			.order('created_at', { ascending: false })
			.limit(15);
		activities = activityData ?? [];
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
