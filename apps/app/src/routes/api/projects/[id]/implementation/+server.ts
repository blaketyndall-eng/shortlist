import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('state')
		.eq('id', params.id)
		.single();

	if (dbError || !project) error(404, 'Project not found');

	return json({ plan: project.state?.implementationPlan ?? null });
};

export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	const { data: project, error: fetchError } = await supabase
		.from('projects')
		.select('state')
		.eq('id', params.id)
		.single();

	if (fetchError || !project) error(404, 'Project not found');

	const state = project.state ?? {};
	state.implementationPlan = body.plan ?? null;

	const { error: updateError } = await supabase
		.from('projects')
		.update({ state, updated_at: new Date().toISOString() })
		.eq('id', params.id);

	if (updateError) error(500, `Failed to save implementation plan: ${updateError.message}`);

	return json({ ok: true });
};
