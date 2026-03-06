import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!locals.session) {
		redirect(303, '/auth/login');
	}

	const { data: project, error: dbError } = await locals.supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	// Check membership
	const { data: membership } = await locals.supabase
		.from('project_members')
		.select('role')
		.eq('project_id', params.id)
		.eq('user_id', locals.user!.id)
		.single();

	if (!membership) {
		error(403, 'You are not a member of this project');
	}

	// Fetch vendors from project state
	const vendors = project.state?.vendors ?? [];
	const criteria = project.state?.criteria ?? [];

	return {
		project,
		membership,
		vendors,
		criteria,
		session: locals.session,
		profile: locals.profile
	};
};
