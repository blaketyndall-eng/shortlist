import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase, createAdminSupabase } from '$services/supabase.server';
import { publishBriefing } from '$lib/services/executive-engine';

/**
 * GET /api/executive/briefings/[id]
 * Get a single briefing.
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const { data: briefing, error: err } = await supabase
		.from('executive_briefings')
		.select('*')
		.eq('id', params.id)
		.single();

	if (err || !briefing) error(404, 'Briefing not found');

	return json({ briefing });
};

/**
 * PATCH /api/executive/briefings/[id]
 * Update briefing status (publish/archive).
 */
export const PATCH: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const adminSupabase = createAdminSupabase();

	if (body.status === 'published') {
		const success = await publishBriefing(adminSupabase, params.id);
		if (!success) error(500, 'Failed to publish briefing');
	} else if (body.status === 'archived') {
		const { error: err } = await adminSupabase
			.from('executive_briefings')
			.update({ status: 'archived' })
			.eq('id', params.id);
		if (err) error(500, 'Failed to archive briefing');
	}

	// Return updated briefing
	const supabase = createServerSupabase(cookies);
	const { data: briefing } = await supabase
		.from('executive_briefings')
		.select('*')
		.eq('id', params.id)
		.single();

	return json({ briefing });
};
