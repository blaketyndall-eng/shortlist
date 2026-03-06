import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects — List projects for the current user
 */
export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);
	const status = url.searchParams.get('status') ?? 'active';
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);

	const { data: projects, error: dbError } = await supabase
		.from('projects')
		.select(`
			*,
			project_members!inner(role)
		`)
		.eq('project_members.user_id', locals.user.id)
		.eq('status', status)
		.order('updated_at', { ascending: false })
		.limit(limit);

	if (dbError) {
		error(500, dbError.message);
	}

	return json({ projects: projects ?? [] });
};

/**
 * POST /api/projects — Create a new project
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();

	if (!body.name?.trim()) {
		error(400, 'Project name is required');
	}

	const supabase = createServerSupabase(cookies);

	const { data: project, error: dbError } = await supabase
		.from('projects')
		.insert({
			name: body.name.trim(),
			description: body.description?.trim() || null,
			category: body.category || null,
			type: body.type ?? 'evaluate',
			status: 'active',
			current_step: 'setup',
			owner_id: locals.user.id,
			created_by: locals.user.id,
			state: {
				vendors: [],
				criteria: [],
				weights: {},
				scores: {},
				aiContext: {}
			}
		})
		.select()
		.single();

	if (dbError) {
		error(500, dbError.message);
	}

	// Add creator as admin member
	await supabase.from('project_members').insert({
		project_id: project.id,
		user_id: locals.user.id,
		role: 'admin'
	});

	// Log activity
	await supabase.from('activity_log').insert({
		project_id: project.id,
		user_id: locals.user.id,
		verb: 'created',
		detail: `Created project "${body.name.trim()}"`
	});

	return json({ project }, { status: 201 });
};
