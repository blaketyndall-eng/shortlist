// ─── VENDOR CLAIMS ──────────────────────────────────────────

export type ClaimSource = 'demo' | 'website' | 'sales_rep' | 'documentation' | 'reference' | 'other';
export type ClaimStatus = 'unverified' | 'verified' | 'disputed' | 'false' | 'partially_true';
export type ClaimImportance = 'low' | 'medium' | 'high' | 'critical';

export interface VendorClaim {
	id: string;
	projectId: string;
	vendorId: string;
	claim: string;
	category: string | null;
	source: ClaimSource | null;
	status: ClaimStatus;
	evidence: string | null;
	verifiedBy: string | null;
	verifiedAt: string | null;
	importance: ClaimImportance;
	createdAt: string;
	updatedAt: string;
}

// ─── NEGOTIATION LOG ────────────────────────────────────────

export type NegotiationType =
	| 'initial_offer'
	| 'counter_offer'
	| 'concession'
	| 'final_offer'
	| 'accepted'
	| 'rejected';

export interface NegotiationTerms {
	price: number | null;
	currency: string;
	term: string | null; // e.g. "12 months"
	discount: number | null; // percentage
	paymentTerms: string | null;
	sla: string | null;
	customTerms: Record<string, unknown>;
}

export interface NegotiationEntry {
	id: string;
	projectId: string;
	vendorId: string;
	roundNumber: number;
	date: string;
	type: NegotiationType | null;
	offeredTerms: NegotiationTerms;
	ourPosition: NegotiationTerms;
	leveragePoints: string[];
	aiSuggestions: {
		tactics: string[];
		benchmarks: string[];
		warnings: string[];
	} | null;
	outcome: string | null;
	notes: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
}

// ─── RISK REGISTER ──────────────────────────────────────────

export type RiskCategory =
	| 'technical'
	| 'financial'
	| 'operational'
	| 'security'
	| 'compliance'
	| 'vendor_stability'
	| 'integration'
	| 'migration'
	| 'contractual'
	| 'other';

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type MitigationStatus = 'open' | 'in_progress' | 'mitigated' | 'accepted' | 'transferred';

export interface RiskEntry {
	id: string;
	projectId: string;
	vendorId: string | null;
	title: string;
	description: string | null;
	category: RiskCategory | null;
	likelihood: RiskLevel | null;
	impact: RiskLevel | null;
	riskScore: number | null;
	mitigationStrategy: string | null;
	mitigationStatus: MitigationStatus;
	ownerId: string | null;
	dueDate: string | null;
	aiIdentified: boolean;
	createdAt: string;
	updatedAt: string;
}

// ─── TCO MODELS ─────────────────────────────────────────────

export interface TCOCostCategory {
	id: string;
	name: string;
	type: 'one_time' | 'recurring' | 'variable';
	amount: number;
	frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
	notes: string | null;
}

export interface TCOYearBreakdown {
	year: number;
	costs: { categoryId: string; amount: number }[];
	total: number;
}

export interface TCOHiddenCost {
	id: string;
	description: string;
	estimatedAmount: number | null;
	confidence: 'low' | 'medium' | 'high';
	aiIdentified: boolean;
}

export interface TCOModel {
	id: string;
	projectId: string;
	vendorId: string;
	name: string;
	years: number;
	currency: string;
	costCategories: TCOCostCategory[];
	yearByYear: TCOYearBreakdown[];
	totalCost: number | null;
	hiddenCosts: TCOHiddenCost[];
	assumptions: string[];
	aiEstimates: Record<string, unknown> | null;
	notes: string | null;
	createdBy: string | null;
	createdAt: string;
	updatedAt: string;
}

// ─── REFERENCE CHECKS ───────────────────────────────────────

export type ReferenceStatus = 'pending' | 'scheduled' | 'completed' | 'declined' | 'no_response';
export type Sentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

export interface ReferenceQuestion {
	id: string;
	question: string;
	category: string;
}

export interface ReferenceResponse {
	questionId: string;
	response: string;
	sentiment: Sentiment | null;
}

export interface ReferenceCheck {
	id: string;
	projectId: string;
	vendorId: string;
	contactName: string;
	contactCompany: string | null;
	contactTitle: string | null;
	contactEmail: string | null;
	status: ReferenceStatus;
	scheduledAt: string | null;
	completedAt: string | null;
	questions: ReferenceQuestion[];
	responses: ReferenceResponse[];
	overallSentiment: Sentiment | null;
	keyTakeaways: string[];
	redFlags: string[];
	notes: string | null;
	conductedBy: string | null;
	createdAt: string;
	updatedAt: string;
}

// ─── COMPANY PROFILE ────────────────────────────────────────

export type CompanySize = '1-50' | '51-200' | '201-1000' | '1001-5000' | '5000+';
export type TechMaturity = 'early' | 'developing' | 'mature' | 'advanced';
export type ProcurementProcess = 'informal' | 'structured' | 'formal_rfp' | 'committee';

export interface CompanyProfile {
	id: string;
	teamId: string | null;
	userId: string;
	companyName: string | null;
	industry: string | null;
	companySize: CompanySize | null;
	techMaturity: TechMaturity | null;
	complianceRequirements: string[];
	currentStack: { name: string; category: string }[];
	priorities: string[];
	vendorPreferences: Record<string, unknown>;
	procurementProcess: ProcurementProcess | null;
	regions: string[];
	budgetAuthority: string | null;
	description: string | null;
	aiContextCache: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

// ─── EVALUATION TEMPLATES ───────────────────────────────────

export interface EvaluationTemplate {
	id: string;
	teamId: string | null;
	createdBy: string;
	name: string;
	description: string | null;
	category: string | null;
	criteria: { name: string; category: string; weight: number; description: string | null }[];
	weights: Record<string, number>;
	workflowConfig: Record<string, unknown>;
	isPublic: boolean;
	useCount: number;
	createdAt: string;
	updatedAt: string;
}
