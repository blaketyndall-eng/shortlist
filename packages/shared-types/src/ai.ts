// ─── AI PIPELINE ─────────────────────────────────────────────

export type AIModel = 'haiku' | 'sonnet' | 'opus';
export type PipelineStage = 'context' | 'execute' | 'recommend' | 'challenge' | 'learn';
export type InteractionPath = 'chat' | 'context_advisor' | 'monitor';

export type EngineName =
	| 'evaluate'
	| 'discovery'
	| 'executive'
	| 'rfp'
	| 'negotiate'
	| 'risk'
	| 'implement'
	| 'vendor';

export type EngineDepth = 'quick' | 'standard' | 'deep';

export type IntelligenceMode = 'standard' | 'executive';

export interface ConfidenceScore {
	overall: number;
	level: ConfidenceLevel;
	factors: ConfidenceFactor[];
}

export type ConfidenceLevel = 'very_high' | 'high' | 'moderate' | 'low' | 'insufficient';

export interface ConfidenceFactor {
	name: string;
	score: number;
	weight: number;
	source: string;
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
	if (score >= 90) return 'very_high';
	if (score >= 70) return 'high';
	if (score >= 50) return 'moderate';
	if (score >= 30) return 'low';
	return 'insufficient';
}

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
	very_high: 'var(--color-confidence-very-high)',
	high: 'var(--color-confidence-high)',
	moderate: 'var(--color-confidence-moderate)',
	low: 'var(--color-confidence-low)',
	insufficient: 'var(--color-confidence-insufficient)'
};

// ─── AI USAGE ────────────────────────────────────────────────

export const MODEL_CREDITS: Record<AIModel, number> = {
	haiku: 1,
	sonnet: 5,
	opus: 20
};

export interface AIUsageRecord {
	teamId: string;
	requestId: string;
	engine: EngineName;
	model: AIModel;
	tokensIn: number;
	tokensOut: number;
	creditsUsed: number;
	timestamp: string;
}

// ─── INTELLIGENCE STORE ──────────────────────────────────────

export type SignalType = 'accepted' | 'modified' | 'ignored' | 'revisited' | 'expanded';

export interface IntelligenceSignal {
	id: string;
	userId: string;
	teamId: string;
	projectId: string | null;
	engine: EngineName;
	interactionPath: InteractionPath;
	signalType: SignalType;
	context: Record<string, unknown>;
	createdAt: string;
}
