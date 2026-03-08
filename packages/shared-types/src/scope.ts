export type ScopeStep = 'signal' | 'cause' | 'options' | 'prepare' | 'endorse';
export type ScopeDecision = 'buy' | 'build' | 'fix' | 'partner' | 'do_nothing';

export const SCOPE_STEPS: ScopeStep[] = ['signal', 'cause', 'options', 'prepare', 'endorse'];
export const SCOPE_LABELS: Record<ScopeStep, string> = {
	signal: 'Signal',
	cause: 'Cause',
	options: 'Options',
	prepare: 'Prepare',
	endorse: 'Endorse'
};

export const SCOPE_SUBTITLES: Record<ScopeStep, string> = {
	signal: 'What triggered this? Capture the problem signal.',
	cause: 'Why is this happening? Diagnose the root cause.',
	options: 'What are our options? Evaluate approaches.',
	prepare: 'Are we ready? Assess readiness and plan.',
	endorse: 'Get buy-in. Generate and approve the decision brief.'
};

export interface ScopeData {
	signal?: {
		trigger: string;
		urgency: number;
		impactedUsers: string[];
		businessImpact: string;
	};
	cause?: {
		hypothesis: string;
		aiCauses?: Array<{
			id: string;
			title: string;
			description: string;
			likelihood: string;
			evidence: string;
			category: string;
		}>;
	};
	options?: {
		recommendations?: Array<{
			approach: ScopeDecision;
			label: string;
			score: number;
			pros: string[];
			cons: string[];
			timeline: string;
			costRange: string;
			riskLevel: string;
		}>;
		selectedApproach?: ScopeDecision;
		reasoning?: string;
	};
	prepare?: {
		budgetEstimate: number;
		timeline: string;
		stakeholders: string;
		riskAssessment: string;
		readinessScore?: number;
		gaps?: Array<{
			area: string;
			title: string;
			detail: string;
			severity: string;
			action: string;
		}>;
	};
	endorse?: {
		brief?: {
			title: string;
			execSummary: string;
			sections: Array<{ heading: string; content: string }>;
			recommendation: string;
			nextSteps: string[];
			riskNote: string;
		};
		requiresApproval: boolean;
		approvalStatus?: 'pending' | 'approved' | 'rejected';
		approverNotes?: string;
	};
}

export interface Scope {
	id: string;
	user_id: string;
	name: string;
	status: 'active' | 'completed' | 'abandoned';
	current_step: ScopeStep;
	data: ScopeData;
	decision?: ScopeDecision;
	project_id?: string;
	completed_at?: string;
	created_at: string;
	updated_at: string;
}
