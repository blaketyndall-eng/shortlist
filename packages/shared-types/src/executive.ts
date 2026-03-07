// ─── EXECUTIVE ENGINE ────────────────────────────────────────

export type BriefingType =
	| 'milestone'
	| 'weekly_digest'
	| 'stage_completion'
	| 'risk_alert'
	| 'vendor_decision';

export type BriefingStatus = 'draft' | 'published' | 'archived';

export interface ExecutiveBriefing {
	id: string;
	project_id: string;
	org_id: string;
	briefing_type: BriefingType;
	title: string;
	summary: string;
	body: BriefingBody;
	key_metrics: ExecutiveMetrics;
	status: BriefingStatus;
	published_at: string | null;
	ai_model: string | null;
	created_by: string; // 'system' or user_id
	created_at: string;
}

export interface BriefingBody {
	sections: BriefingSection[];
	recommendedActions?: string[];
}

export interface BriefingSection {
	heading: string;
	content: string;
	data?: Record<string, unknown>;
	type?: 'text' | 'metric' | 'list' | 'alert';
}

export interface ExecutiveMetrics {
	vendorsEvaluated: number;
	alignmentScore: number;
	budgetUtilization: number;
	riskLevel: 'low' | 'medium' | 'high';
	activePolls: number;
	teamParticipation: number; // percentage 0-100
}

export interface ExecutiveDashboardData {
	activeProjects: number;
	overallAlignmentScore: number;
	vendorsInPipeline: number;
	riskAlerts: number;
	teamParticipationRate: number;
	projects: ProjectHealthSummary[];
	recentBriefings: ExecutiveBriefing[];
}

export interface ProjectHealthSummary {
	id: string;
	name: string;
	currentStage: string;
	alignmentScore: number;
	vendorCount: number;
	lastActivity: string;
	riskLevel: 'low' | 'medium' | 'high';
	status: string;
}

// Briefing type display config
export const BRIEFING_TYPE_CONFIG: Record<BriefingType, { label: string; color: string; icon: string }> = {
	milestone: { label: 'Milestone', color: '#00cc96', icon: '🏁' },
	weekly_digest: { label: 'Weekly Digest', color: '#4a96f8', icon: '📊' },
	stage_completion: { label: 'Stage Complete', color: '#a78bfa', icon: '✅' },
	risk_alert: { label: 'Risk Alert', color: '#ef4444', icon: '⚠️' },
	vendor_decision: { label: 'Vendor Decision', color: '#f5a623', icon: '🏢' }
};
