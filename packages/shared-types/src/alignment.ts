// ─── ALIGNMENT ENGINE ────────────────────────────────────────

export type PollType = 'likert' | 'multiple_choice' | 'ranking' | 'yes_no';

export type AlignmentContext =
	| 'vendor_alignment'
	| 'priority_alignment'
	| 'challenge_alignment'
	| 'budget_alignment'
	| 'general';

export type PollStatus = 'active' | 'closed' | 'archived';

export interface AlignmentPoll {
	id: string;
	project_id: string;
	org_id: string;
	created_by: string;
	title: string;
	description: string | null;
	poll_type: PollType;
	context_type: AlignmentContext;
	context_ref: Record<string, unknown> | null;
	options: PollOption[];
	solve_stage: string | null;
	status: PollStatus;
	closes_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface PollOption {
	id: string;
	label: string;
	description?: string;
}

export interface AlignmentResponse {
	id: string;
	poll_id: string;
	user_id: string;
	value: PollValue;
	comment: string | null;
	role: string; // captured at response time
	created_at: string;
}

export type PollValue =
	| { score: number } // likert (1-5)
	| { choice: string } // multiple_choice
	| { ranking: string[] } // ranking
	| { answer: boolean }; // yes_no

export interface AlignmentScores {
	overall: number; // 0-100
	byRole: Record<string, number>;
	byDimension: Record<string, number>;
	gaps: AlignmentGap[];
}

export interface AlignmentGap {
	dimension: string;
	spread: number; // difference between highest and lowest role avg
	highRole: string;
	lowRole: string;
	recommendation: string;
}

export interface AlignmentAnalysis {
	id: string;
	project_id: string;
	poll_id: string | null;
	analysis_type: 'poll_summary' | 'stage_alignment' | 'overall_alignment' | 'gap_analysis';
	scores: AlignmentScores;
	insights: string[];
	recommendations: string[];
	ai_model: string | null;
	created_at: string;
}

export interface ProjectAlignmentSummary {
	projectId: string;
	overallScore: number;
	roleBreakdown: Record<string, number>;
	dimensionBreakdown: Record<string, number>;
	activePolls: number;
	totalResponses: number;
	gaps: AlignmentGap[];
	lastAnalyzedAt: string | null;
}

// Helper to determine alignment health
export function getAlignmentHealth(score: number): 'strong' | 'moderate' | 'weak' | 'critical' {
	if (score >= 80) return 'strong';
	if (score >= 60) return 'moderate';
	if (score >= 40) return 'weak';
	return 'critical';
}

export const ALIGNMENT_COLORS: Record<ReturnType<typeof getAlignmentHealth>, string> = {
	strong: '#00cc96',
	moderate: '#4a96f8',
	weak: '#f5a623',
	critical: '#ef4444'
};
