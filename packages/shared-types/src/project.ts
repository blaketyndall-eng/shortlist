// ─── PROJECT ─────────────────────────────────────────────────

export type ProjectPhase = 'define' | 'evaluate' | 'complete';

export type SolveStep =
	| 'triggers'
	| 'category'
	| 'vendor_discovery'
	| 'constraints'
	| 'priorities'
	| 'brief'
	| 'challenges';

export type EvaluateStep =
	| 'discovery'
	| 'setup'
	| 'criteria'
	| 'workflow'
	| 'materials'
	| 'ratings'
	| 'results';

export type WizardStep = SolveStep | EvaluateStep;

export interface Project {
	id: string;
	teamId: string;
	createdBy: string;
	name: string;
	description: string | null;
	category: string | null;
	status: 'active' | 'completed' | 'archived';
	phase: ProjectPhase;
	currentStep: WizardStep;
	state: ProjectState;
	solveData: SolvePhaseState;
	version: number;
	projectFamilyId: string | null;
	clonedFrom: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ProjectState {
	vendors: ProjectVendor[];
	criteria: Criterion[];
	weights: Record<string, number>;
	scores: Record<string, Record<string, number>>;
	aiContext: Record<string, unknown>;
}

// ─── SOLVE PHASE STATE ──────────────────────────────────────

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface SolveTrigger {
	id: string;
	label: string;
	selected: boolean;
	detail: string | null;
}

export interface TriggerQuestion {
	id: string;
	question: string;
	answer: string | null;
	triggerId: string;
}

export interface DiscoveredVendor {
	id: string;
	name: string;
	website: string | null;
	tagline: string | null;
	matchScore: number | null;
	matchReasons: string[];
	swiped: 'left' | 'right' | null;
	vendorProfileId: string | null;
}

export interface SolveConstraint {
	id: string;
	type: 'technical' | 'budget' | 'timeline' | 'compliance' | 'integration' | 'other';
	description: string;
	hardLimit: boolean;
}

export interface SolveStakeholder {
	id: string;
	name: string;
	role: string;
	department: string | null;
	influence: 'decision_maker' | 'influencer' | 'user' | 'approver';
	concerns: string[];
}

export type PriorityTier = 'must_have' | 'nice_to_have' | 'bonus';

export interface SolvePriority {
	id: string;
	label: string;
	tier: PriorityTier;
	description: string | null;
}

export interface KnockoutEntry {
	vendorId: string;
	criterionId: string;
	pass: boolean | null;
	notes: string | null;
}

export interface ChallengeQuestion {
	id: string;
	question: string;
	category: string;
	aiGenerated: boolean;
}

export interface ChallengeResponse {
	questionId: string;
	response: string;
	satisfactory: boolean | null;
}

export interface SolvePhaseState {
	triggers: SolveTrigger[];
	triggerQuestions: TriggerQuestion[];
	budgetRange: string | null;
	timeline: string | null;
	urgency: Urgency | null;
	categoryDetected: string | null;
	categoryConfidence: number | null;
	categoryAlternatives: { name: string; confidence: number }[];
	discoveredVendors: DiscoveredVendor[];
	shortlistedVendorIds: string[];
	constraints: SolveConstraint[];
	stakeholders: SolveStakeholder[];
	priorities: {
		must_have: SolvePriority[];
		nice_to_have: SolvePriority[];
		bonus: SolvePriority[];
	};
	knockoutMatrix: KnockoutEntry[];
	problemBrief: string | null;
	briefGeneratedAt: string | null;
	challengeQuestions: ChallengeQuestion[];
	challengeResponses: ChallengeResponse[];
	completedSteps: SolveStep[];
}

export const EMPTY_SOLVE_STATE: SolvePhaseState = {
	triggers: [],
	triggerQuestions: [],
	budgetRange: null,
	timeline: null,
	urgency: null,
	categoryDetected: null,
	categoryConfidence: null,
	categoryAlternatives: [],
	discoveredVendors: [],
	shortlistedVendorIds: [],
	constraints: [],
	stakeholders: [],
	priorities: { must_have: [], nice_to_have: [], bonus: [] },
	knockoutMatrix: [],
	problemBrief: null,
	briefGeneratedAt: null,
	challengeQuestions: [],
	challengeResponses: [],
	completedSteps: [],
};

// ─── SOLVE STEP METADATA ────────────────────────────────────

export const SOLVE_STEPS: { key: SolveStep; label: string; description: string }[] = [
	{ key: 'triggers', label: 'Diagnose', description: 'Identify what triggered your search' },
	{ key: 'category', label: 'Category', description: 'AI classifies your software category' },
	{ key: 'vendor_discovery', label: 'Discovery', description: 'Discover and swipe on vendors' },
	{ key: 'constraints', label: 'Constraints', description: 'Define hard limits & stakeholders' },
	{ key: 'priorities', label: 'Priorities', description: 'Must-have, nice-to-have, bonus' },
	{ key: 'brief', label: 'Brief', description: 'AI-generated problem brief' },
	{ key: 'challenges', label: 'Validate', description: 'Challenge and validate your brief' },
];

export const EVALUATE_STEPS: { key: EvaluateStep; label: string; description: string }[] = [
	{ key: 'discovery', label: 'Discovery', description: 'Review vendor landscape' },
	{ key: 'setup', label: 'Setup', description: 'Configure evaluation parameters' },
	{ key: 'criteria', label: 'Criteria', description: 'Define scoring criteria' },
	{ key: 'workflow', label: 'Workflow', description: 'Set evaluation workflow' },
	{ key: 'materials', label: 'Materials', description: 'Collect vendor materials' },
	{ key: 'ratings', label: 'Ratings', description: 'Score and compare vendors' },
	{ key: 'results', label: 'Results', description: 'Final analysis and recommendation' },
];

// ─── VENDOR (within a project) ───────────────────────────────

export interface ProjectVendor {
	id: string;
	name: string;
	vendorProfileId: string | null;
	website: string | null;
	notes: string | null;
	addedAt: string;
}

// ─── CRITERIA ────────────────────────────────────────────────

export interface Criterion {
	id: string;
	name: string;
	category: string;
	weight: number;
	description: string | null;
	source: 'user' | 'ai_suggested' | 'template';
}

// ─── EVALUATION SCORES ───────────────────────────────────────

export interface EvalScore {
	id: string;
	projectId: string;
	userId: string;
	vendorId: string;
	criterionId: string;
	score: number;
	notes: string | null;
	aiAssisted: boolean;
	scoredAt: string;
}

// ─── PROJECT VERSION SNAPSHOT ────────────────────────────────

export interface ProjectVersionSnapshot {
	id: string;
	projectId: string;
	snapshotData: ProjectState;
	createdAt: string;
}
