import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects/[id]/demos/[sessionId]/feedback
 * Get all feedback for a demo session
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

	const feedback = project.solve_data?.demoFeedback?.[params.sessionId] ?? {};
	return json({ feedback });
};

/**
 * POST /api/projects/[id]/demos/[sessionId]/feedback
 * Submit feedback for a demo session
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { overallScore, notes, criteriaScores, prompts } = body;

	if (overallScore === undefined || overallScore === null) {
		error(400, 'Overall score is required');
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
	const allFeedback = { ...(currentSolveData.demoFeedback ?? {}) };
	const sessionFeedback = { ...(allFeedback[params.sessionId] ?? {}) };
	const userId = locals.user.id;

	sessionFeedback[userId] = {
		overallScore,
		notes: notes ?? '',
		criteriaScores: criteriaScores ?? {},
		prompts: prompts ?? {},
		submittedAt: new Date().toISOString(),
	};

	allFeedback[params.sessionId] = sessionFeedback;

	// Check if all attendees have submitted
	const sessions = [...(currentSolveData.demoSessions ?? [])];
	const session = sessions.find((s: any) => s.id === params.sessionId);
	const feedbackCount = Object.keys(sessionFeedback).length;
	const attendeeCount = session?.attendees?.length ?? 1;

	// Auto-complete session if all attendees submitted
	if (session && feedbackCount >= attendeeCount) {
		session.status = 'completed';
	}

	const { error: updateError } = await supabase
		.from('projects')
		.update({
			solve_data: {
				...currentSolveData,
				demoFeedback: allFeedback,
				demoSessions: sessions,
			},
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (updateError) {
		error(500, `Failed to save feedback: ${updateError.message}`);
	}

	// Log activity
	try {
		await supabase.from('activity_log').insert({
			project_id: params.id,
			user_id: locals.user.id,
			action: 'demo_feedback_submitted',
			details: {
				sessionId: params.sessionId,
				vendorName: session?.vendorName,
				overallScore,
			},
		});
	} catch {
		// Non-critical
	}

	return json({
		success: true,
		allSubmitted: feedbackCount >= attendeeCount,
	});
};
