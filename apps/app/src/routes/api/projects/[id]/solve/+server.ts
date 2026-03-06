import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects/[id]/solve
 * Retrieve SOLVE phase data for a project
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);
	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('id, name, phase, solve_data, current_step')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	return json({ solveData: project.solve_data ?? {}, phase: project.phase, currentStep: project.current_step });
};

/**
 * PATCH /api/projects/[id]/solve
 * Update SOLVE phase data (partial merge into solve_data JSONB)
 */
export const PATCH: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	// Fetch current solve_data to merge
	const { data: current, error: fetchError } = await supabase
		.from('projects')
		.select('solve_data')
		.eq('id', params.id)
		.single();

	if (fetchError || !current) {
		error(404, 'Project not found');
	}

	const currentSolveData = current.solve_data ?? {};
	const updates: Record<string, unknown> = {
		solve_data: { ...currentSolveData, ...body.solveData },
		updated_at: new Date().toISOString(),
	};

	// Optional: update current_step if provided
	if (body.currentStep) {
		updates.current_step = body.currentStep;
	}

	// Optional: update phase if provided
	if (body.phase) {
		updates.phase = body.phase;
	}

	const { data: project, error: updateError } = await supabase
		.from('projects')
		.update(updates)
		.eq('id', params.id)
		.select('id, solve_data, current_step, phase')
		.single();

	if (updateError) {
		error(500, `Failed to update solve data: ${updateError.message}`);
	}

	return json({ project });
};

/**
 * POST /api/projects/[id]/solve
 * Complete SOLVE phase and transition to EVALUATE
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	// Validate required data for transition
	if (!body.evalState?.vendors?.length) {
		error(400, 'At least one vendor is required to start evaluation');
	}
	if (!body.evalState?.criteria?.length) {
		error(400, 'At least one criterion is required to start evaluation');
	}

	const { error: updateError } = await supabase
		.from('projects')
		.update({
			phase: 'evaluate',
			current_step: 'discovery',
			state: body.evalState,
			solve_data: body.solveData,
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (updateError) {
		error(500, `Failed to transition to evaluate: ${updateError.message}`);
	}

	// Log activity
	try {
		await supabase.from('activity_log').insert({
			project_id: params.id,
			user_id: locals.user.id,
			action: 'phase_transition',
			details: { from: 'define', to: 'evaluate', vendorCount: body.evalState.vendors.length },
		});
	} catch {
		// Non-critical, don't fail the request
	}

	return json({ success: true, phase: 'evaluate' });
};
