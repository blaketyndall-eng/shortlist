import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { getProjectAlignment } from '$lib/services/alignment-engine';

/**
 * GET /api/alignment/project/[projectId]
 * Get overall project alignment summary.
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const summary = await getProjectAlignment(supabase, params.projectId);

	return json({ alignment: summary });
};
