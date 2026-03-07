import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/** GET /api/scopes/[id] — Fetch full SCOPE session */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const { data: scope, error: dbError } = await supabase
		.from('scopes')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (dbError || !scope) error(404, 'Scope not found');

	return json({ scope });
};

/** PATCH /api/scopes/[id] — Update SCOPE session */
export const PATCH: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	// Build update object from allowed fields
	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};

	if (body.name !== undefined) updates.name = body.name;
	if (body.status !== undefined) updates.status = body.status;
	if (body.current_step !== undefined) updates.current_step = body.current_step;
	if (body.data !== undefined) updates.data = body.data;
	if (body.decision !== undefined) updates.decision = body.decision;
	if (body.completed_at !== undefined) updates.completed_at = body.completed_at;

	const { data: scope, error: dbError } = await supabase
		.from('scopes')
		.update(updates)
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.select()
		.single();

	if (dbError) error(500, dbError.message);
	if (!scope) error(404, 'Scope not found');

	return json({ scope });
};
