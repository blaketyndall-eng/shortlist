import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;

	// Get all active projects for this user (to select from)
	const { data: projects } = await locals.supabase
		.from('projects')
		.select(`
			id, name, type, status, category, current_step, state, updated_at,
			project_members!inner(role)
		`)
		.eq('project_members.user_id', userId)
		.eq('status', 'active')
		.order('updated_at', { ascending: false });

	// If specific project IDs are in the URL, load those for comparison
	const selectedIds = url.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];

	let selectedProjects: any[] = [];
	if (selectedIds.length > 0) {
		const { data } = await locals.supabase
			.from('projects')
			.select('*')
			.in('id', selectedIds);
		selectedProjects = data ?? [];
	}

	return {
		allProjects: projects ?? [],
		selectedProjects
	};
};
