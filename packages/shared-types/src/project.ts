// ─── PROJECT ─────────────────────────────────────────────────

export interface Project {
	id: string;
	teamId: string;
	createdBy: string;
	name: string;
	description: string | null;
	category: string | null;
	status: 'active' | 'completed' | 'archived';
	currentStep: WizardStep;
	state: ProjectState;
	version: number;
	projectFamilyId: string | null;
	clonedFrom: string | null;
	createdAt: string;
	updatedAt: string;
}

export type WizardStep =
	| 'discovery'
	| 'setup'
	| 'criteria'
	| 'workflow'
	| 'materials'
	| 'ratings'
	| 'results';

export interface ProjectState {
	vendors: ProjectVendor[];
	criteria: Criterion[];
	weights: Record<string, number>;
	scores: Record<string, Record<string, number>>;
	aiContext: Record<string, unknown>;
}

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
