import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminSupabase } from '$services/supabase.server';
import { hasPermission } from '@shortlist/shared-types/auth';

/**
 * POST /api/executive/briefings/[id]/approve
 * Leadership approval of a briefing.
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const role = locals.profile?.role ?? 'member';
	if (!hasPermission(role as any, 'canApproveBrief')) {
		error(403, 'Only leadership can approve briefings');
	}

	const adminSupabase = createAdminSupabase();

	const { error: err } = await adminSupabase
		.from('executive_briefings')
		.update({
			status: 'published',
			published_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (err) error(500, 'Failed to approve briefing');

	return json({ success: true, approvedBy: locals.user.id });
};
