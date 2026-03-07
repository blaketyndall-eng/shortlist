import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { submitResponse } from '$lib/services/alignment-engine';

/**
 * POST /api/alignment/polls/[id]/respond
 * Submit or update a response to an alignment poll.
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	if (!body.value) error(400, 'Missing response value');

	const supabase = createServerSupabase(cookies);

	// Verify poll exists and is active
	const { data: poll } = await supabase
		.from('alignment_polls')
		.select('id, status')
		.eq('id', params.id)
		.single();

	if (!poll) error(404, 'Poll not found');
	if (poll.status !== 'active') error(400, 'Poll is no longer active');

	const role = locals.profile?.role ?? 'member';
	const success = await submitResponse(
		supabase,
		params.id,
		locals.user.id,
		body.value,
		role,
		body.comment
	);

	if (!success) error(500, 'Failed to submit response');

	return json({ success: true });
};
