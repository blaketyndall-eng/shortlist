import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase, createAdminSupabase } from '$services/supabase.server';
import { analyzePollLocally, formatResponsesByRole } from '$lib/services/alignment-engine';
import { generateBriefing } from '$lib/services/executive-engine';
import { env } from '$env/dynamic/private';

/**
 * GET /api/alignment/polls/[id]/analyze
 * Get the latest analysis for a poll.
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const { data: analysis } = await supabase
		.from('alignment_analysis')
		.select('*')
		.eq('poll_id', params.id)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	if (!analysis) {
		return json({ analysis: null, message: 'No analysis available yet' });
	}

	return json({ analysis });
};

/**
 * POST /api/alignment/polls/[id]/analyze
 * Trigger AI analysis of poll results.
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);

	// Fetch poll
	const { data: poll } = await supabase
		.from('alignment_polls')
		.select('*')
		.eq('id', params.id)
		.single();

	if (!poll) error(404, 'Poll not found');

	// Fetch responses
	const { data: responses } = await supabase
		.from('alignment_responses')
		.select('*')
		.eq('poll_id', params.id);

	if (!responses || responses.length < 2) {
		error(400, 'Need at least 2 responses to analyze');
	}

	// Fetch project name
	const { data: project } = await supabase
		.from('projects')
		.select('name')
		.eq('id', poll.project_id)
		.single();

	// Try AI analysis first, fall back to local
	let scores;
	let aiModel: string | null = null;
	let insights: string[] = [];
	let recommendations: string[] = [];

	if (env.ANTHROPIC_API_KEY) {
		try {
			const responsesByRole = formatResponsesByRole(responses as any);
			const aiResponse = await fetch(new URL('/api/ai/engine', request.url).toString(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': request.headers.get('Cookie') ?? '',
				},
				body: JSON.stringify({
					engine: 'alignment_analyze',
					depth: 'standard',
					projectId: poll.project_id,
					context: {
						pollTitle: poll.title,
						contextType: poll.context_type,
						solveStage: poll.solve_stage,
						projectName: project?.name ?? 'Unknown',
						responsesByRole,
						totalRespondents: responses.length,
					},
				}),
			});

			if (aiResponse.ok) {
				const aiResult = await aiResponse.json();
				const data = aiResult.data ?? aiResult.result;
				if (data?.overall !== undefined) {
					scores = {
						overall: data.overall,
						byRole: data.byRole ?? {},
						byDimension: data.byDimension ?? {},
						gaps: data.gaps ?? [],
					};
					insights = data.insights ?? [];
					recommendations = data.recommendations ?? [];
					aiModel = aiResult.model ?? 'sonnet';
				}
			}
		} catch (e) {
			console.error('AI analysis failed, falling back to local:', e);
		}
	}

	// Fallback to local calculation
	if (!scores) {
		scores = await analyzePollLocally(supabase, params.id);
		if (!scores) error(500, 'Analysis failed');
	}

	// Store analysis using admin client (bypasses RLS)
	const adminSupabase = createAdminSupabase();
	const { data: analysis, error: insertErr } = await adminSupabase
		.from('alignment_analysis')
		.insert({
			project_id: poll.project_id,
			poll_id: params.id,
			analysis_type: 'poll_summary',
			scores,
			insights,
			recommendations,
			ai_model: aiModel,
		})
		.select('*')
		.single();

	if (insertErr) {
		console.error('Failed to store analysis:', insertErr.message);
		error(500, 'Failed to store analysis');
	}

	// Intelligence Web: trigger risk alert if alignment score drops below 60
	if (scores.overall < 60) {
		try {
			const { data: proj } = await supabase
				.from('projects')
				.select('org_id')
				.eq('id', poll.project_id)
				.single();

			if (proj?.org_id) {
				const origin = new URL(request.url).origin;
				const cookieHeader = request.headers.get('Cookie') ?? '';
				generateBriefing(supabase, adminSupabase, {
					projectId: poll.project_id,
					orgId: proj.org_id,
					briefingType: 'risk_alert',
					baseUrl: origin,
					cookieHeader,
				}).catch(() => { /* non-critical */ });
			}
		} catch {
			// Non-critical
		}
	}

	return json({ analysis });
};
