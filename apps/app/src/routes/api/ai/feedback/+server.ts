import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * POST /api/ai/feedback
 * Record user feedback (thumbs up/down) on AI-generated outputs.
 * Used to track AI quality and enable future prompt optimization.
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();

	if (!body.engine || !body.projectId || body.rating === undefined) {
		error(400, 'Missing required fields: engine, projectId, rating');
	}

	const supabase = createServerSupabase(cookies);

	const { error: insertErr } = await supabase.from('ai_feedback').insert({
		user_id: locals.user.id,
		project_id: body.projectId,
		engine: body.engine,
		rating: body.rating, // 1 = thumbs up, -1 = thumbs down
		comment: body.comment ?? null,
		context_snapshot: body.contextSnapshot ?? null,
		output_snapshot: body.outputSnapshot ?? null,
	});

	if (insertErr) {
		// Table might not exist yet — gracefully degrade
		console.warn('AI feedback insert failed:', insertErr.message);
		return json({ success: false, reason: 'storage_unavailable' });
	}

	return json({ success: true });
};
