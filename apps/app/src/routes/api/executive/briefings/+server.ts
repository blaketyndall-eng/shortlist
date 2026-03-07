import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase, createAdminSupabase } from '$services/supabase.server';
import { hasPermission } from '@shortlist/shared-types/auth';
import { generateBriefing } from '$lib/services/executive-engine';

/**
 * GET /api/executive/briefings?projectId=...&orgId=...
 * List briefings.
 */
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	let query = supabase
		.from('executive_briefings')
		.select('*')
		.order('created_at', { ascending: false });

	const projectId = url.searchParams.get('projectId');
	const orgId = url.searchParams.get('orgId') ?? locals.profile?.org_id;

	if (projectId) {
		query = query.eq('project_id', projectId);
	} else if (orgId) {
		query = query.eq('org_id', orgId);
	}

	const limit = parseInt(url.searchParams.get('limit') ?? '20');
	query = query.limit(limit);

	const { data: briefings, error: err } = await query;
	if (err) error(500, err.message);

	return json({ briefings: briefings ?? [] });
};

/**
 * POST /api/executive/briefings
 * Generate a new executive briefing.
 */
export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const role = locals.profile?.role ?? 'member';
	if (!hasPermission(role as any, 'canViewExecutiveDashboard') && role !== 'admin') {
		error(403, 'Only leadership and admin can generate briefings');
	}

	const body = await request.json();
	if (!body.projectId || !body.briefingType) {
		error(400, 'Missing required fields: projectId, briefingType');
	}

	const supabase = createServerSupabase(cookies);
	const adminSupabase = createAdminSupabase();

	const briefing = await generateBriefing(supabase, adminSupabase, {
		projectId: body.projectId,
		orgId: locals.profile?.org_id ?? '',
		briefingType: body.briefingType,
		baseUrl: url.origin,
		cookieHeader: request.headers.get('Cookie') ?? '',
	});

	if (!briefing) error(500, 'Failed to generate briefing');

	return json({ briefing }, { status: 201 });
};
