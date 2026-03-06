import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Fetch teams with all members
	const { data: memberships } = await locals.supabase
		.from('team_members')
		.select(`
			role,
			teams(
				id, name, slug, created_at,
				team_members(
					role,
					profiles:user_id(id, email, full_name, avatar_url)
				)
			)
		`)
		.eq('user_id', userId);

	return {
		memberships: memberships ?? [],
		userId
	};
};
