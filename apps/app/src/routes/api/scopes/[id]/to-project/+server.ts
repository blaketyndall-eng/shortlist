import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, fetch }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	// 1. Load scope
	const { data: scope, error: scopeErr } = await locals.supabase
		.from('scopes')
		.select('*')
		.eq('id', params.id)
		.single();

	if (scopeErr || !scope) error(404, 'Scope not found');

	const decision = scope.decision ?? scope.data?.options?.selectedApproach;
	if (!decision) error(400, 'No decision set on this scope');

	// 2. Do Nothing — just mark complete
	if (decision === 'do_nothing') {
		await locals.supabase
			.from('scopes')
			.update({
				status: 'completed',
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq('id', scope.id);

		return json({ scope, project: null });
	}

	// 3. Build SOLVE data from SCOPE context
	const signal = scope.data?.signal ?? {};
	const cause = scope.data?.cause ?? {};
	const prepare = scope.data?.prepare ?? {};

	// Map SCOPE data into SOLVE fields
	const solveData: Record<string, unknown> = {
		triggersText: signal.trigger ?? '',
		businessImpact: signal.businessImpact ?? '',
		urgency: signal.urgency ?? 3,
		impactedUsers: signal.impactedUsers ?? [],
		hypothesis: cause.hypothesis ?? '',
		budgetRange: prepare.budgetEstimate
			? `$${Number(prepare.budgetEstimate).toLocaleString()}`
			: '',
		timeline: prepare.timeline ?? '',
		stakeholders: prepare.stakeholders ?? '',
		riskAssessment: prepare.riskAssessment ?? '',
		scopeId: scope.id,
		fromScope: true,
	};

	// 4. Create project
	const isBuy = decision === 'buy';
	const projectPayload = {
		name: scope.name,
		user_id: locals.user.id,
		phase: isBuy ? 'define' : 'active',
		current_step: isBuy ? 'triggers' : 'scope',
		status: 'active',
		solve_data: solveData,
		state: {},
		category: null,
	};

	const { data: project, error: projErr } = await locals.supabase
		.from('projects')
		.insert(projectPayload)
		.select()
		.single();

	if (projErr) error(500, `Failed to create project: ${projErr.message}`);

	// 5. Link scope to project, mark completed
	await locals.supabase
		.from('scopes')
		.update({
			project_id: project.id,
			status: 'completed',
			completed_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', scope.id);

	return json({ scope, project });
};
