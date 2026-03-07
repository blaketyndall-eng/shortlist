import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase, createAdminSupabase } from '$services/supabase.server';
import { generateBriefing } from '$lib/services/executive-engine';

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
export const PATCH: RequestHandler = async ({ params, request, locals, cookies, url }) => {
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
		.select('id, solve_data, current_step, phase, org_id')
		.single();

	if (updateError) {
		error(500, `Failed to update solve data: ${updateError.message}`);
	}

	// Intelligence Web: auto-generate executive briefing on stage transitions
	if (body.currentStep && project?.org_id) {
		try {
			const adminSupabase = createAdminSupabase();
			const origin = request.headers.get('origin') ?? url.origin ?? '';
			const cookieHeader = request.headers.get('cookie') ?? '';
			generateBriefing(supabase, adminSupabase, {
				projectId: params.id,
				orgId: project.org_id,
				briefingType: 'stage_completion',
				baseUrl: origin,
				cookieHeader,
			}).catch(() => { /* non-critical */ });
		} catch {
			// Non-critical: don't fail the solve update
		}
	}

	return json({ project });
};

/**
 * POST /api/projects/[id]/solve
 * Complete SOLVE phase and transition to EVALUATE
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies, url }) => {
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

	// Intelligence Web: auto-generate milestone briefing on phase completion
	try {
		const adminSupabase = createAdminSupabase();
		// Get org_id for briefing
		const { data: proj } = await supabase
			.from('projects')
			.select('org_id')
			.eq('id', params.id)
			.single();

		if (proj?.org_id) {
			const origin = request.headers.get('origin') ?? url.origin ?? '';
			const cookieHeader = request.headers.get('cookie') ?? '';
			generateBriefing(supabase, adminSupabase, {
				projectId: params.id,
				orgId: proj.org_id,
				briefingType: 'milestone',
				baseUrl: origin,
				cookieHeader,
			}).catch(() => { /* non-critical */ });
		}
	} catch {
		// Non-critical
	}

	return json({ success: true, phase: 'evaluate' });
};

/**
 * DELETE /api/projects/[id]/solve
 * Rollback from EVALUATE phase back to DEFINE (reversible phase transition).
 * Preserves all SOLVE data — just resets the phase flag and step.
 */
export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	// Verify project exists and is in evaluate phase
	const { data: project, error: fetchErr } = await supabase
		.from('projects')
		.select('id, phase, solve_data, org_id')
		.eq('id', params.id)
		.single();

	if (fetchErr || !project) {
		error(404, 'Project not found');
	}

	if (project.phase !== 'evaluate') {
		error(400, 'Project is not in evaluate phase — nothing to rollback');
	}

	// Rollback: set phase back to define, restore last SOLVE step
	const lastSolveStep = project.solve_data?.lastCompletedStep ?? 'challenges';
	const { error: updateErr } = await supabase
		.from('projects')
		.update({
			phase: 'define',
			current_step: lastSolveStep,
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (updateErr) {
		error(500, `Failed to rollback: ${updateErr.message}`);
	}

	// Log the rollback
	try {
		await supabase.from('activity_log').insert({
			project_id: params.id,
			user_id: locals.user.id,
			action: 'phase_rollback',
			details: { from: 'evaluate', to: 'define', restoredStep: lastSolveStep },
		});
	} catch {
		// Non-critical
	}

	return json({ success: true, phase: 'define', currentStep: lastSolveStep });
};
