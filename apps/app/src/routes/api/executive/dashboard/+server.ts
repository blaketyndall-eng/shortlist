import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { hasPermission } from '@shortlist/shared-types/auth';
import { getExecutiveDashboard } from '$lib/services/executive-engine';

/**
 * GET /api/executive/dashboard
 * Executive dashboard data — leadership and admin only.
 */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const role = locals.profile?.role ?? 'member';
	if (!hasPermission(role as any, 'canViewExecutiveDashboard') && role !== 'admin') {
		error(403, 'Executive dashboard requires leadership or admin role');
	}

	const orgId = locals.profile?.org_id;
	if (!orgId) error(400, 'No organization found');

	const supabase = createServerSupabase(cookies);
	const dashboard = await getExecutiveDashboard(supabase, orgId);

	return json(dashboard);
};
