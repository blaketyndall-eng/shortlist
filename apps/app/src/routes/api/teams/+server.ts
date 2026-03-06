import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/teams — List teams the current user belongs to
 */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { data: memberships, error: dbError } = await supabase
		.from('team_members')
		.select(`
			role,
			teams(id, name, slug, org_id, created_at)
		`)
		.eq('user_id', locals.user.id);

	if (dbError) {
		error(500, dbError.message);
	}

	return json({ teams: memberships ?? [] });
};

/**
 * POST /api/teams — Create a new team
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();

	if (!body.name?.trim()) {
		error(400, 'Team name is required');
	}

	const supabase = createServerSupabase(cookies);

	const slug = body.name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const { data: team, error: dbError } = await supabase
		.from('teams')
		.insert({
			name: body.name.trim(),
			slug,
			org_id: body.orgId || null
		})
		.select()
		.single();

	if (dbError) {
		error(500, dbError.message);
	}

	// Add creator as admin
	await supabase.from('team_members').insert({
		team_id: team.id,
		user_id: locals.user.id,
		role: 'admin'
	});

	return json({ team }, { status: 201 });
};
