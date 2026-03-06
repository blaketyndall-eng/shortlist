import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const status = url.searchParams.get('status') ?? 'all';
	const category = url.searchParams.get('category');
	const search = url.searchParams.get('q');

	let query = locals.supabase
		.from('projects')
		.select(`
			id, name, type, status, category, current_step, state, created_at, updated_at,
			project_members!inner(role, user_id)
		`)
		.eq('project_members.user_id', userId)
		.order('updated_at', { ascending: false });

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	if (category) {
		query = query.eq('category', category);
	}

	if (search) {
		query = query.ilike('name', `%${search}%`);
	}

	const { data: projects } = await query.limit(50);

	return {
		projects: projects ?? [],
		filters: { status, category, search }
	};
};
