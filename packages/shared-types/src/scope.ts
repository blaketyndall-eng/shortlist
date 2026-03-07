// ─── SCOPE WORKFLOW ─────────────────────────────────────────

export type ScopeStep = 'signal' | 'cause' | 'options' | 'prepare' | 'endorse';
export type ScopeStatus = 'active' | 'completed' | 'abandoned';
export type ScopeDecision = 'buy' | 'build' | 'fix' | 'partner' | 'do_nothing';

export const SCOPE_STEPS: ScopeStep[] = ['signal', 'cause', 'options', 'prepare', 'endorse'];

export const SCOPE_LABELS: Record<ScopeStep, string> = {
	signal: 'Signal',
	cause: 'Cause',
	options: 'Options',
	prepare: 'Prepare',
	endorse: 'Endorse',
};

export const SCOPE_DESCRIPTIONS: Record<ScopeStep, string> = {
	signal: 'What triggered this? Capture the problem signal.',
	cause: 'Why is this happening? Dig into root causes.',
	options: 'What are our options? Buy, build, fix, or do nothing.',
	prepare: 'Are we ready? Budget, timeline, stakeholders, risks.',
	endorse: 'Get the green light. Decision brief and approval.',
};

export const DECISION_LABELS: Record<ScopeDecision, string> = {
	buy: 'Buy Software',
	build: 'Build In-House',
	fix: 'Fix Existing Tool',
	partner: 'Partner / Outsource',
	do_nothing: 'Do Nothing',
};

export interface ScopeSignalData {
	trigger: string;
	urgency: number; // 1-5
	impactedUsers: string[];
	businessImpact: string;
}

export interface ScopeCauseData {
	hypothesis: string;
	aiCauses?: Array<{
		hypothesis: string;
		likelihood: string;
		rationale: string;
		questionsToValidate: string[];
	}>;
	pollId?: string;
}

export interface ScopeOptionsData {
	recommendations?: Array<{
		approach: ScopeDecision;
		label: string;
		description: string;
		pros: string[];
		cons: string[];
		estimatedTimeline: string;
		estimatedCost: string;
		riskLevel: 'high' | 'medium' | 'low';
		recommendedIf: string;
	}>;
	selectedApproach?: ScopeDecision;
	pollId?: string;
}

export interface ScopePrepareData {
	budgetEstimate: number;
	timeline: string;
	stakeholders: string;
	riskAssessment: string;
	readinessScore?: number;
	gaps?: Array<{
		area: string;
		severity: 'high' | 'medium' | 'low';
		description: string;
		recommendation: string;
	}>;
	blockers?: string[];
}

export interface ScopeEndorseData {
	brief?: {
		title: string;
		executiveSummary: string;
		sections: Array<{ heading: string; body: string; keyPoints: string[] }>;
		recommendation: string;
		costOfInaction: string;
		nextSteps: string[];
	};
	requiresApproval: boolean;
	approvalStatus?: 'pending' | 'approved' | 'rejected';
	approverNotes?: string;
}

export interface ScopeData {
	signal?: ScopeSignalData;
	cause?: ScopeCauseData;
	options?: ScopeOptionsData;
	prepare?: ScopePrepareData;
	endorse?: ScopeEndorseData;
}

export interface Scope {
	id: string;
	user_id: string;
	name: string;
	status: ScopeStatus;
	current_step: ScopeStep;
	data: ScopeData;
	decision: ScopeDecision | null;
	project_id: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}
