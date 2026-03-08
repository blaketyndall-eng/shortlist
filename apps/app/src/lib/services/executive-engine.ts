import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	ExecutiveBriefing,
	BriefingType,
	ExecutiveDashboardData,
	ProjectHealthSummary,
	ExecutiveMetrics
} from '@shortlist/shared-types/executive';
import type { ProjectAlignmentSummary } from '@shortlist/shared-types/alignment';

// ─── BRIEFING GENERATION ────────────────────────────────────

export interface GenerateBriefingConfig {
	projectId: string;
	orgId: string;
	briefingType: BriefingType;
	/** Base URL for internal API calls (e.g., origin) */
	baseUrl: string;
	/** Cookie header for auth forwarding */
	cookieHeader: string;
}

export async function generateBriefing(
	supabase: SupabaseClient,
	adminSupabase: SupabaseClient,
	config: GenerateBriefingConfig
): Promise<ExecutiveBriefing | null> {
	// 1. Gather project data
	const { data: project } = await supabase
		.from('projects')
		.select('*')
		.eq('id', config.projectId)
		.single();

	if (!project) return null;

	const state = (project.state ?? {}) as Record<string, unknown>;
	const solveData = (project.solve_data ?? {}) as Record<string, unknown>;

	// 2. Get vendor data
	const { data: projectVendors } = await supabase
		.from('project_members')
		.select('*')
		.eq('project_id', config.projectId);

	// 3. Get alignment data
	const { data: analyses } = await supabase
		.from('alignment_analysis')
		.select('*')
		.eq('project_id', config.projectId)
		.order('created_at', { ascending: false })
		.limit(5);

	const latestAlignment = analyses?.[0]?.scores as Record<string, unknown> | undefined;

	// 4. Get recent activity
	const { data: activity } = await supabase
		.from('activity_log')
		.select('*')
		.eq('project_id', config.projectId)
		.order('created_at', { ascending: false })
		.limit(10);

	// 5. Build context for AI
	const vendorNames = (state.vendors as Array<{ name: string }> | undefined)?.map(v => v.name) ?? [];
	const context = {
		projectName: project.name,
		milestoneType: config.briefingType,
		category: state.category ?? solveData.category ?? 'unknown',
		problem: solveData.problem ?? state.problem ?? '',
		budget: solveData.budget ?? state.budget ?? '',
		teamSize: solveData.teamSize ?? state.teamSize ?? '',
		currentStage: project.current_stage ?? 'unknown',
		stagesCompleted: project.stages_completed ?? [],
		vendorSummary: vendorNames.length > 0
			? `${vendorNames.length} vendors: ${vendorNames.join(', ')}`
			: 'No vendors in pipeline',
		alignmentSummary: latestAlignment
			? `Overall: ${latestAlignment.overall ?? 'N/A'}/100, By Role: ${JSON.stringify(latestAlignment.byRole ?? {})}`
			: 'No alignment data yet',
		pendingDecisions: 'Vendor selection, budget approval',
		recentActivity: (activity ?? []).slice(0, 5).map((a: any) => a.description ?? a.action).join('; ') || 'None',
	};

	// 6. Call AI engine
	try {
		const aiResponse = await fetch(`${config.baseUrl}/api/ai/engine`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': config.cookieHeader,
			},
			body: JSON.stringify({
				engine: 'executive_milestone_brief',
				depth: 'deep',
				projectId: config.projectId,
				context,
			}),
		});

		if (!aiResponse.ok) {
			console.error('AI briefing generation failed:', aiResponse.statusText);
			return createFallbackBriefing(adminSupabase, config, project, context);
		}

		const aiResult = await aiResponse.json();
		const data = aiResult.data ?? aiResult.result;

		// 7. Store briefing
		const { data: briefing, error: insertErr } = await adminSupabase
			.from('executive_briefings')
			.insert({
				project_id: config.projectId,
				org_id: config.orgId,
				briefing_type: config.briefingType,
				title: data.title ?? `${config.briefingType} Briefing: ${project.name}`,
				summary: data.summary ?? 'Briefing generated.',
				body: { sections: data.sections ?? [], recommendedActions: data.recommendedActions ?? [] },
				key_metrics: data.keyMetrics ?? {},
				status: 'draft',
				ai_model: aiResult.model ?? 'opus',
				created_by: 'system',
			})
			.select('*')
			.single();

		if (insertErr) {
			console.error('Failed to store briefing:', insertErr.message);
			return null;
		}

		return briefing as ExecutiveBriefing;
	} catch (e) {
		console.error('Briefing generation error:', e);
		return createFallbackBriefing(adminSupabase, config, project, context);
	}
}

async function createFallbackBriefing(
	adminSupabase: SupabaseClient,
	config: GenerateBriefingConfig,
	project: any,
	context: Record<string, unknown>
): Promise<ExecutiveBriefing | null> {
	const { data: briefing } = await adminSupabase
		.from('executive_briefings')
		.insert({
			project_id: config.projectId,
			org_id: config.orgId,
			briefing_type: config.briefingType,
			title: `${config.briefingType} Update: ${project.name}`,
			summary: `Project "${project.name}" ${config.briefingType} update. Currently at stage: ${context.currentStage}.`,
			body: {
				sections: [
					{ heading: 'Status', content: `Project is at the ${context.currentStage} stage.`, type: 'text' },
					{ heading: 'Vendors', content: String(context.vendorSummary), type: 'text' },
					{ heading: 'Alignment', content: String(context.alignmentSummary), type: 'text' },
				],
				recommendedActions: ['Review vendor pipeline', 'Check team alignment scores'],
			},
			key_metrics: {
				vendorsEvaluated: 0,
				alignmentScore: 0,
				budgetUtilization: 0,
				riskLevel: 'medium',
				activePolls: 0,
				teamParticipation: 0,
			},
			status: 'draft',
			ai_model: null,
			created_by: 'system',
		})
		.select('*')
		.single();

	return briefing as ExecutiveBriefing | null;
}

// ─── EXECUTIVE DASHBOARD ────────────────────────────────────

export async function getExecutiveDashboard(
	supabase: SupabaseClient,
	orgId: string
): Promise<ExecutiveDashboardData> {
	// Get all org projects
	const { data: projects } = await supabase
		.from('projects')
		.select('*')
		.eq('org_id', orgId)
		.order('updated_at', { ascending: false });

	const projectList = projects ?? [];

	// Build project health summaries
	const projectHealthPromises = projectList.map(async (p: any) => {
		const state = (p.state ?? {}) as Record<string, unknown>;
		const vendors = (state.vendors as unknown[]) ?? [];

		// Get alignment for this project
		const { data: analysis } = await supabase
			.from('alignment_analysis')
			.select('scores')
			.eq('project_id', p.id)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		const scores = analysis?.scores as Record<string, unknown> | undefined;
		const alignmentScore = (scores?.overall as number) ?? 0;

		return {
			id: p.id,
			name: p.name,
			currentStage: p.current_stage ?? 'setup',
			alignmentScore,
			vendorCount: vendors.length,
			lastActivity: p.updated_at,
			riskLevel: alignmentScore < 40 ? 'high' : alignmentScore < 60 ? 'medium' : 'low',
			status: p.status ?? 'active',
		} satisfies ProjectHealthSummary;
	});

	const projectHealth = await Promise.all(projectHealthPromises);

	// Get recent briefings
	const { data: briefings } = await supabase
		.from('executive_briefings')
		.select('*')
		.eq('org_id', orgId)
		.order('created_at', { ascending: false })
		.limit(10);

	// Aggregate metrics
	const alignmentScores = projectHealth.map(p => p.alignmentScore).filter(s => s > 0);
	const overallAlignment = alignmentScores.length > 0
		? Math.round(alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length)
		: 0;

	const totalVendors = projectHealth.reduce((sum, p) => sum + p.vendorCount, 0);
	const riskAlerts = projectHealth.filter(p => p.riskLevel === 'high').length;

	// Calculate team participation rate from poll response data
	const { data: allPolls } = await supabase
		.from('alignment_polls')
		.select('id')
		.eq('org_id', orgId);

	let teamParticipationRate = 0;
	if (allPolls && allPolls.length > 0) {
		const pollIds = allPolls.map(p => p.id);
		const { data: responses } = await supabase
			.from('alignment_responses')
			.select('poll_id, user_id')
			.in('poll_id', pollIds);

		const { data: members } = await supabase
			.from('team_members')
			.select('user_id')
			.eq('org_id', orgId);

		const totalMembers = members?.length ?? 1;
		const uniqueRespondents = new Set((responses ?? []).map((r: any) => r.user_id)).size;
		teamParticipationRate = Math.round((uniqueRespondents / Math.max(totalMembers, 1)) * 100);
	}

	return {
		activeProjects: projectList.filter((p: any) => p.status !== 'archived').length,
		overallAlignmentScore: overallAlignment,
		vendorsInPipeline: totalVendors,
		riskAlerts,
		teamParticipationRate,
		projects: projectHealth,
		recentBriefings: (briefings ?? []) as ExecutiveBriefing[],
	};
}

// ─── BRIEFING MANAGEMENT ────────────────────────────────────

export async function publishBriefing(
	adminSupabase: SupabaseClient,
	briefingId: string
): Promise<boolean> {
	const { error } = await adminSupabase
		.from('executive_briefings')
		.update({
			status: 'published',
			published_at: new Date().toISOString(),
		})
		.eq('id', briefingId);

	return !error;
}
