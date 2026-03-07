import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	AlignmentPoll,
	AlignmentScores,
	AlignmentGap,
	AlignmentContext,
	PollType,
	PollValue,
	ProjectAlignmentSummary
} from '@shortlist/shared-types/alignment';

// ─── POLL MANAGEMENT ────────────────────────────────────────

export interface CreatePollConfig {
	projectId: string;
	orgId: string;
	createdBy: string;
	title: string;
	description?: string;
	pollType?: PollType;
	contextType: AlignmentContext;
	contextRef?: Record<string, unknown>;
	options?: Array<{ id: string; label: string; description?: string }>;
	solveStage?: string;
	closesAt?: string;
}

export async function createPoll(
	supabase: SupabaseClient,
	config: CreatePollConfig
): Promise<AlignmentPoll | null> {
	const { data, error } = await supabase
		.from('alignment_polls')
		.insert({
			project_id: config.projectId,
			org_id: config.orgId,
			created_by: config.createdBy,
			title: config.title,
			description: config.description ?? null,
			poll_type: config.pollType ?? 'likert',
			context_type: config.contextType,
			context_ref: config.contextRef ?? null,
			options: config.options ?? [],
			solve_stage: config.solveStage ?? null,
			status: 'active',
			closes_at: config.closesAt ?? null,
		})
		.select('*')
		.single();

	if (error) {
		console.error('Failed to create poll:', error.message);
		return null;
	}
	return data as AlignmentPoll;
}

export async function submitResponse(
	supabase: SupabaseClient,
	pollId: string,
	userId: string,
	value: PollValue,
	role: string,
	comment?: string
): Promise<boolean> {
	const { error } = await supabase
		.from('alignment_responses')
		.upsert(
			{
				poll_id: pollId,
				user_id: userId,
				value,
				role,
				comment: comment ?? null,
			},
			{ onConflict: 'poll_id,user_id' }
		);

	if (error) {
		console.error('Failed to submit response:', error.message);
		return false;
	}
	return true;
}

// ─── ANALYSIS ───────────────────────────────────────────────

export async function analyzePollLocally(
	supabase: SupabaseClient,
	pollId: string
): Promise<AlignmentScores | null> {
	// Fetch poll and responses
	const { data: poll } = await supabase
		.from('alignment_polls')
		.select('*')
		.eq('id', pollId)
		.single();

	if (!poll) return null;

	const { data: responses } = await supabase
		.from('alignment_responses')
		.select('*')
		.eq('poll_id', pollId);

	if (!responses || responses.length === 0) {
		return { overall: 0, byRole: {}, byDimension: {}, gaps: [] };
	}

	// Group by role
	const byRole: Record<string, number[]> = {};
	for (const r of responses) {
		const role = r.role || 'member';
		if (!byRole[role]) byRole[role] = [];
		const val = r.value as PollValue;
		if ('score' in val) {
			byRole[role].push(val.score);
		} else if ('answer' in val) {
			byRole[role].push(val.answer ? 5 : 1);
		}
	}

	// Calculate averages per role (normalize to 0-100)
	const roleAverages: Record<string, number> = {};
	for (const [role, scores] of Object.entries(byRole)) {
		const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
		roleAverages[role] = Math.round((avg / 5) * 100); // likert 1-5 → 0-100
	}

	// Overall = average of all role averages
	const roleValues = Object.values(roleAverages);
	const overall = roleValues.length > 0
		? Math.round(roleValues.reduce((a, b) => a + b, 0) / roleValues.length)
		: 0;

	// Dimension breakdown
	const dimension = poll.context_type || 'general';
	const byDimension: Record<string, number> = { [dimension]: overall };

	// Gap detection
	const gaps: AlignmentGap[] = [];
	if (roleValues.length >= 2) {
		const maxRole = Object.entries(roleAverages).reduce((a, b) => a[1] > b[1] ? a : b);
		const minRole = Object.entries(roleAverages).reduce((a, b) => a[1] < b[1] ? a : b);
		const spread = maxRole[1] - minRole[1];

		if (spread > 20) {
			gaps.push({
				dimension,
				spread,
				highRole: maxRole[0],
				lowRole: minRole[0],
				recommendation: `${minRole[0]} role scores significantly lower than ${maxRole[0]}. Consider a focused alignment discussion.`,
			});
		}
	}

	return { overall, byRole: roleAverages, byDimension, gaps };
}

export async function getProjectAlignment(
	supabase: SupabaseClient,
	projectId: string
): Promise<ProjectAlignmentSummary> {
	// Get all analyses for this project
	const { data: analyses } = await supabase
		.from('alignment_analysis')
		.select('*')
		.eq('project_id', projectId)
		.order('created_at', { ascending: false });

	// Get active polls count
	const { count: activePolls } = await supabase
		.from('alignment_polls')
		.select('*', { count: 'exact', head: true })
		.eq('project_id', projectId)
		.eq('status', 'active');

	// Get total responses
	const { data: pollIds } = await supabase
		.from('alignment_polls')
		.select('id')
		.eq('project_id', projectId);

	let totalResponses = 0;
	if (pollIds && pollIds.length > 0) {
		const { count } = await supabase
			.from('alignment_responses')
			.select('*', { count: 'exact', head: true })
			.in('poll_id', pollIds.map(p => p.id));
		totalResponses = count ?? 0;
	}

	// Aggregate scores from latest analyses
	let overallScore = 0;
	const roleBreakdown: Record<string, number[]> = {};
	const dimensionBreakdown: Record<string, number[]> = {};
	const allGaps: AlignmentGap[] = [];

	if (analyses && analyses.length > 0) {
		for (const a of analyses) {
			const scores = a.scores as AlignmentScores;
			if (scores.overall) overallScore += scores.overall;
			if (scores.byRole) {
				for (const [role, score] of Object.entries(scores.byRole)) {
					if (!roleBreakdown[role]) roleBreakdown[role] = [];
					roleBreakdown[role].push(score);
				}
			}
			if (scores.byDimension) {
				for (const [dim, score] of Object.entries(scores.byDimension)) {
					if (!dimensionBreakdown[dim]) dimensionBreakdown[dim] = [];
					dimensionBreakdown[dim].push(score);
				}
			}
			if (scores.gaps) allGaps.push(...scores.gaps);
		}
		overallScore = Math.round(overallScore / analyses.length);
	}

	// Average role/dimension breakdowns
	const avgRole: Record<string, number> = {};
	for (const [role, scores] of Object.entries(roleBreakdown)) {
		avgRole[role] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
	}
	const avgDim: Record<string, number> = {};
	for (const [dim, scores] of Object.entries(dimensionBreakdown)) {
		avgDim[dim] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
	}

	return {
		projectId,
		overallScore,
		roleBreakdown: avgRole,
		dimensionBreakdown: avgDim,
		activePolls: activePolls ?? 0,
		totalResponses,
		gaps: allGaps.slice(0, 5), // top 5 gaps
		lastAnalyzedAt: analyses?.[0]?.created_at ?? null,
	};
}

// ─── RESPONSE FORMATTING ────────────────────────────────────

export function formatResponsesByRole(
	responses: Array<{ value: PollValue; role: string; comment: string | null }>
): string {
	const grouped: Record<string, Array<{ value: PollValue; comment: string | null }>> = {};
	for (const r of responses) {
		const role = r.role || 'member';
		if (!grouped[role]) grouped[role] = [];
		grouped[role].push({ value: r.value, comment: r.comment });
	}

	const lines: string[] = [];
	for (const [role, items] of Object.entries(grouped)) {
		lines.push(`${role} (${items.length} responses):`);
		for (const item of items) {
			const val = 'score' in item.value ? `Score: ${item.value.score}/5` :
				'answer' in item.value ? `Answer: ${item.value.answer ? 'Yes' : 'No'}` :
				'choice' in item.value ? `Choice: ${item.value.choice}` :
				JSON.stringify(item.value);
			lines.push(`  - ${val}${item.comment ? ` (Note: "${item.comment}")` : ''}`);
		}
	}
	return lines.join('\n');
}
