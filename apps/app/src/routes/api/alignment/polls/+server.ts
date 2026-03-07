import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { createPoll } from '$lib/services/alignment-engine';

/**
 * GET /api/alignment/polls?projectId=...&stage=...
 * List polls for a project, optionally filtered by Solve stage.
 */
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const projectId = url.searchParams.get('projectId');
	if (!projectId) error(400, 'Missing projectId');

	const supabase = createServerSupabase(cookies);
	let query = supabase
		.from('alignment_polls')
		.select('*, alignment_responses(count)')
		.eq('project_id', projectId)
		.order('created_at', { ascending: false });

	const stage = url.searchParams.get('stage');
	if (stage) {
		query = query.eq('solve_stage', stage);
	}

	const { data: polls, error: err } = await query;
	if (err) error(500, err.message);

	// Also fetch user's responses for each poll
	const pollIds = (polls ?? []).map((p: any) => p.id);
	const { data: userResponses } = await supabase
		.from('alignment_responses')
		.select('poll_id, value, comment')
		.eq('user_id', locals.user.id)
		.in('poll_id', pollIds.length > 0 ? pollIds : ['__none__']);

	const responseMap = new Map((userResponses ?? []).map((r: any) => [r.poll_id, r]));

	const enriched = (polls ?? []).map((p: any) => ({
		...p,
		responseCount: p.alignment_responses?.[0]?.count ?? 0,
		userResponse: responseMap.get(p.id) ?? null,
	}));

	return json({ polls: enriched });
};

/**
 * POST /api/alignment/polls
 * Create a new alignment poll.
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	if (!body.projectId || !body.title || !body.contextType) {
		error(400, 'Missing required fields: projectId, title, contextType');
	}

	const supabase = createServerSupabase(cookies);

	const poll = await createPoll(supabase, {
		projectId: body.projectId,
		orgId: locals.profile?.org_id ?? body.orgId ?? '',
		createdBy: locals.user.id,
		title: body.title,
		description: body.description,
		pollType: body.pollType ?? 'likert',
		contextType: body.contextType,
		contextRef: body.contextRef,
		options: body.options,
		solveStage: body.solveStage,
		closesAt: body.closesAt,
	});

	if (!poll) error(500, 'Failed to create poll');

	return json({ poll }, { status: 201 });
};
