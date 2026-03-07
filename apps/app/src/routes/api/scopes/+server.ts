import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/** GET /api/scopes — List user's SCOPE sessions */
export const GET: RequestHandler = async ({ locals, cookies, url }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const status = url.searchParams.get('status') ?? 'active';

	let query = supabase
		.from('scopes')
		.select('id, name, status, current_step, decision, project_id, created_at, updated_at, completed_at')
		.eq('user_id', locals.user.id)
		.order('updated_at', { ascending: false })
		.limit(50);

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	const { data: scopes, error: dbError } = await query;

	if (dbError) error(500, dbError.message);

	return json({ scopes: scopes ?? [] });
};

/** POST /api/scopes — Create new SCOPE session */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	if (!body.name?.trim()) error(400, 'Name is required');

	const supabase = createServerSupabase(cookies);

	const { data: scope, error: dbError } = await supabase
		.from('scopes')
		.insert({
			user_id: locals.user.id,
			name: body.name.trim(),
			status: 'active',
			current_step: 'signal',
			data: {},
		})
		.select()
		.single();

	if (dbError) error(500, dbError.message);

	return json({ scope }, { status: 201 });
};
