import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects/[id]/health
 * Returns proactive health nudges for a project.
 * Caches result in project state for 1 hour.
 */
export const GET: RequestHandler = async ({ params, locals, cookies, fetch }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	// Load project
	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	// Check cache — don't re-run if checked within the last hour
	const state = (project.state ?? {}) as Record<string, unknown>;
	const lastCheck = state.lastHealthCheck as Record<string, unknown> | undefined;
	if (lastCheck?.checkedAt) {
		const age = Date.now() - new Date(lastCheck.checkedAt as string).getTime();
		if (age < 60 * 60 * 1000) {
			return json({ nudges: lastCheck.nudges, overallHealth: lastCheck.overallHealth, healthScore: lastCheck.healthScore, cached: true });
		}
	}

	// Compute signals for the health check engine
	const solve = (project.solve_data ?? {}) as Record<string, unknown>;
	const vendors = Array.isArray(state.vendors) ? state.vendors : [];
	const criteria = Array.isArray(state.criteria) ? state.criteria : [];
	const scores = (state.scores ?? {}) as Record<string, Record<string, number>>;

	const createdAt = new Date(project.created_at);
	const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

	// Check last activity from activity_log
	let daysSinceLastActivity = daysSinceCreated;
	try {
		const { data: lastActivity } = await supabase
			.from('activity_log')
			.select('created_at')
			.eq('project_id', params.id)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();
		if (lastActivity) {
			daysSinceLastActivity = Math.floor(
				(Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24)
			);
		}
	} catch {
		// activity_log may not exist
	}

	// Count scored vendors
	let vendorsScored = 0;
	for (const v of vendors) {
		const vendorScores = scores[(v as Record<string, unknown>).id as string];
		if (vendorScores && Object.keys(vendorScores).length > 0) {
			vendorsScored++;
		}
	}

	// Count active polls
	let activePolls = 0;
	try {
		const { count } = await supabase
			.from('alignment_polls')
			.select('id', { count: 'exact', head: true })
			.eq('project_id', params.id)
			.eq('status', 'active');
		activePolls = count ?? 0;
	} catch {
		// alignment_polls may not exist
	}

	// Call the AI engine
	try {
		const aiResponse = await fetch('/api/ai/engine', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				engine: 'project_health_check',
				projectId: params.id,
				depth: 'quick',
				context: {
					daysSinceCreated,
					daysSinceLastActivity,
					currentStep: project.current_step,
					vendorsScored,
					totalVendors: vendors.length,
					criteriaCount: criteria.length,
					activePolls,
				},
			}),
		});

		if (!aiResponse.ok) {
			error(502, 'Health check engine failed');
		}

		const aiResult = await aiResponse.json();
		const healthData = aiResult.data ?? aiResult.result ?? {};

		// Cache result in project state
		const updatedState = {
			...state,
			lastHealthCheck: {
				nudges: healthData.nudges ?? [],
				overallHealth: healthData.overallHealth ?? 'unknown',
				healthScore: healthData.healthScore ?? 50,
				checkedAt: new Date().toISOString(),
			},
		};

		await supabase
			.from('projects')
			.update({ state: updatedState, updated_at: new Date().toISOString() })
			.eq('id', params.id);

		return json({
			nudges: healthData.nudges ?? [],
			overallHealth: healthData.overallHealth ?? 'unknown',
			healthScore: healthData.healthScore ?? 50,
			cached: false,
		});
	} catch (err: any) {
		if (err.status) throw err;
		error(500, `Health check failed: ${err.message}`);
	}
};
