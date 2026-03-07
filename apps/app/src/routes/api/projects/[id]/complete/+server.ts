import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * POST /api/projects/[id]/complete
 * Mark project as complete, capture debrief data, run AI debrief synthesis.
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies, fetch: serverFetch }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);
	const body = await request.json();

	// Load project
	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	const {
		selectedVendor,
		rationale,
		actualCost,
		surprises,
		timeline,
	} = body;

	if (!selectedVendor) {
		error(400, 'Selected vendor is required');
	}

	// Build completion data
	const completionData = {
		selectedVendor,
		rationale: rationale || '',
		actualCost: actualCost || null,
		surprises: surprises || '',
		timeline: timeline || '',
		decidedAt: new Date().toISOString(),
		decidedBy: locals.user.id,
	};

	// Run deal_debrief AI engine
	let aiDebrief = null;
	try {
		const state = (project.state ?? {}) as Record<string, unknown>;
		const vendors = Array.isArray(state.vendors) ? state.vendors : [];
		const selectedV = vendors.find((v: any) => v.name === selectedVendor || v.id === selectedVendor);

		const aiResponse = await serverFetch('/api/ai/engine', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				engine: 'deal_debrief',
				projectId: params.id,
				depth: 'standard',
				context: {
					selectedVendor: selectedV?.name ?? selectedVendor,
					rationale,
					costComparison: actualCost ? `Actual: ${actualCost}` : 'Not provided',
					timeline: timeline || 'Not specified',
					surprises: surprises || 'None reported',
				},
			}),
		});

		if (aiResponse.ok) {
			const result = await aiResponse.json();
			aiDebrief = result.data ?? result.result ?? null;
		}
	} catch {
		// Non-critical — continue without AI debrief
	}

	// Update project state with completion
	const currentState = (project.state ?? {}) as Record<string, unknown>;
	const updatedState = {
		...currentState,
		completion: {
			...completionData,
			aiDebrief,
		},
	};

	// Mark project as complete
	const { error: updateError } = await supabase
		.from('projects')
		.update({
			status: 'completed',
			phase: 'complete',
			state: updatedState,
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	if (updateError) {
		error(500, `Failed to complete project: ${updateError.message}`);
	}

	// Log activity
	try {
		await supabase.from('activity_log').insert({
			project_id: params.id,
			user_id: locals.user.id,
			verb: 'project_completed',
			detail: `Project completed. Selected vendor: ${selectedVendor}`,
			metadata: { selectedVendor, rationale },
		});
	} catch {
		// Non-critical
	}

	return json({
		success: true,
		completion: completionData,
		aiDebrief,
	});
};

/**
 * GET /api/projects/[id]/complete
 * Get completion/debrief data for a completed project.
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { data: project } = await supabase
		.from('projects')
		.select('state, status')
		.eq('id', params.id)
		.single();

	if (!project) {
		error(404, 'Project not found');
	}

	const state = (project.state ?? {}) as Record<string, unknown>;
	const completion = state.completion as Record<string, unknown> | undefined;

	return json({
		completed: project.status === 'completed',
		completion: completion ?? null,
	});
};
