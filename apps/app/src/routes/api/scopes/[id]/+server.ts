import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const { data, error: err } = await locals.supabase
		.from('scopes')
		.select('*')
		.eq('id', params.id)
		.single();

	if (err || !data) error(404, 'Scope not found');
	return json(data);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

	if (body.data !== undefined) updates.data = body.data;
	if (body.current_step !== undefined) updates.current_step = body.current_step;
	if (body.status !== undefined) updates.status = body.status;
	if (body.decision !== undefined) updates.decision = body.decision;
	if (body.project_id !== undefined) updates.project_id = body.project_id;
	if (body.completed_at !== undefined) updates.completed_at = body.completed_at;

	const { data, error: err } = await locals.supabase
		.from('scopes')
		.update(updates)
		.eq('id', params.id)
		.select()
		.single();

	if (err) error(500, err.message);
	return json(data);
};
