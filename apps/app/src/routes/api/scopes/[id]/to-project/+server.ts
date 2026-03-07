import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/** POST /api/scopes/[id]/to-project — Transition a completed SCOPE into a project */
export const POST: RequestHandler = async ({ params, request, locals, cookies, fetch: serverFetch }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const decision = body.decision;
	if (!decision) error(400, 'Decision is required');

	const supabase = createServerSupabase(cookies);

	// Load the scope
	const { data: scope, error: scopeError } = await supabase
		.from('scopes')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (scopeError || !scope) error(404, 'Scope not found');

	// If "do nothing", just mark complete
	if (decision === 'do_nothing') {
		const { data: updated } = await supabase
			.from('scopes')
			.update({
				status: 'completed',
				decision: 'do_nothing',
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', params.id)
			.select()
			.single();

		return json({ scope: updated, project: null });
	}

	// For buy/build/fix/partner — create a project
	const scopeData = scope.data ?? {};
	const isBuy = decision === 'buy';

	// Use AI to map SCOPE data → SOLVE fields (for buy decisions)
	let solveData: Record<string, unknown> = {};
	if (isBuy) {
		try {
			const aiRes = await serverFetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'scope_import',
					depth: 'quick',
					context: {
						signal: scopeData.signal ?? {},
						cause: scopeData.cause ?? {},
						options: scopeData.options ?? {},
						prepare: scopeData.prepare ?? {},
						endorse: scopeData.endorse ?? {},
						decision,
					},
				}),
			});

			if (aiRes.ok) {
				const aiData = await aiRes.json();
				solveData = aiData.result ?? aiData.data ?? {};
			}
		} catch {
			// Non-critical — create project without AI mapping
		}
	}

	// Build project state
	const projectState: Record<string, unknown> = {
		vendors: [],
		criteria: [],
		weights: {},
		scores: {},
		aiContext: {},
		// Import SCOPE data
		scopeImport: {
			scopeId: scope.id,
			decision,
			signal: scopeData.signal,
			cause: scopeData.cause,
			selectedApproach: scopeData.options?.selectedApproach,
			budgetEstimate: scopeData.prepare?.budgetEstimate,
			timeline: scopeData.prepare?.timeline,
		},
	};

	// For buy decisions, merge AI-mapped SOLVE fields
	if (isBuy && solveData) {
		if (solveData.triggers) projectState.solveImportedTriggers = solveData.triggers;
		if (solveData.constraints) projectState.solveImportedConstraints = solveData.constraints;
		if (solveData.stakeholders) projectState.solveImportedStakeholders = solveData.stakeholders;
		if (solveData.successMetrics) projectState.solveImportedMetrics = solveData.successMetrics;
	}

	// Determine project type and initial step
	const projectType = isBuy ? 'evaluate' : 'fix';
	const initialStep = isBuy ? 'scope' : 'setup';

	// Create the project
	const { data: project, error: projError } = await supabase
		.from('projects')
		.insert({
			name: scope.name,
			type: projectType,
			status: 'active',
			current_step: initialStep,
			owner_id: locals.user.id,
			created_by: locals.user.id,
			state: projectState,
			category: null,
		})
		.select()
		.single();

	if (projError || !project) error(500, projError?.message ?? 'Failed to create project');

	// Link scope to project
	await supabase
		.from('scopes')
		.update({
			status: 'completed',
			decision,
			project_id: project.id,
			completed_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', params.id);

	return json({ scope: { ...scope, project_id: project.id, status: 'completed' }, project });
};
