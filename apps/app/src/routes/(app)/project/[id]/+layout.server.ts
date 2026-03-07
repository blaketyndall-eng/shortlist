import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!locals.session) {
		redirect(303, '/auth/login');
	}

	const userId = locals.user!.id;

	// Fetch project — RLS project_owner_all policy allows owner access
	const { data: project, error: dbError } = await locals.supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	// Determine membership: owner gets admin role automatically,
	// otherwise check the project_members table
	let membership: { role: string } | null = null;

	if (project.owner_id === userId) {
		membership = { role: 'admin' };
	} else {
		const { data: memberRow } = await locals.supabase
			.from('project_members')
			.select('role')
			.eq('project_id', params.id)
			.eq('user_id', userId)
			.single();
		membership = memberRow;
	}

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
