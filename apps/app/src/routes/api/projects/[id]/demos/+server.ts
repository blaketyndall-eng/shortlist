import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects/[id]/demos
 * Get all demo sessions for a project
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);
	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('solve_data')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	const sessions = project.solve_data?.demoSessions ?? [];
	return json({ sessions });
};

/**
 * POST /api/projects/[id]/demos
 * Create a new demo session
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { vendorName, date, attendees, notes } = body;

	if (!vendorName || !date) {
		error(400, 'Vendor name and date are required');
	}

	const supabase = createServerSupabase(cookies);

	// Fetch current solve_data
	const { data: project, error: fetchError } = await supabase
		.from('projects')
		.select('solve_data')
		.eq('id', params.id)
		.single();

	if (fetchError || !project) {
		error(404, 'Project not found');
	}

	const currentSolveData = project.solve_data ?? {};
	const sessions = [...(currentSolveData.demoSessions ?? [])];

	const newSession = {
		id: `demo_${Date.now()}`,
		vendorName,
		date,
		attendees: attendees ?? [locals.user.email],
		status: 'scheduled',
		questionSet: [],
		notes: notes ?? '',
	};

	sessions.push(newSession);

	const { error: updateError } = await supabase
		.from('projects')
		.update({
			solve_data: { ...currentSolveData, demoSessions: sessions },
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (updateError) {
		error(500, `Failed to create demo session: ${updateError.message}`);
	}

	// Log activity
	try {
		await supabase.from('activity_log').insert({
			project_id: params.id,
			user_id: locals.user.id,
			action: 'demo_scheduled',
			details: { vendorName, date, sessionId: newSession.id },
		});
	} catch {
		// Non-critical
	}

	return json({ session: newSession });
};

/**
 * PATCH /api/projects/[id]/demos
 * Update a demo session (mark complete, add questions, etc.)
 */
export const PATCH: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { sessionId, updates } = body;

	if (!sessionId) {
		error(400, 'Session ID is required');
	}

	const supabase = createServerSupabase(cookies);

	const { data: project, error: fetchError } = await supabase
		.from('projects')
		.select('solve_data')
		.eq('id', params.id)
		.single();

	if (fetchError || !project) {
		error(404, 'Project not found');
	}

	const currentSolveData = project.solve_data ?? {};
	const sessions = [...(currentSolveData.demoSessions ?? [])];
	const sessionIdx = sessions.findIndex((s: any) => s.id === sessionId);

	if (sessionIdx === -1) {
		error(404, 'Demo session not found');
	}

	sessions[sessionIdx] = { ...sessions[sessionIdx], ...updates };

	const { error: updateError } = await supabase
		.from('projects')
		.update({
			solve_data: { ...currentSolveData, demoSessions: sessions },
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (updateError) {
		error(500, `Failed to update demo session: ${updateError.message}`);
	}

	return json({ session: sessions[sessionIdx] });
};
