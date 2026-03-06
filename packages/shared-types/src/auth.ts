// ─── ROLES ───────────────────────────────────────────────────

export type TeamRole = 'admin' | 'member' | 'leadership';
export type OrgRole = 'org_admin' | 'member';

// ─── USER ────────────────────────────────────────────────────

export interface UserProfile {
	id: string;
	email: string;
	full_name: string | null;
	avatar_url: string | null;
	company: string | null;
	job_title: string | null;
	role: TeamRole;
	user_type: 'b2b' | 'consumer' | 'both';
	onboarding_completed: boolean;
	trial_started_at: string;
	trial_ends_at: string;
	created_at: string;
	updated_at: string;
}

// ─── TEAM ────────────────────────────────────────────────────

export interface Team {
	id: string;
	orgId: string;
	name: string;
	createdAt: string;
}

export interface TeamMember {
	id: string;
	teamId: string;
	userId: string;
	name: string;
	email: string | null;
	title: string | null;
	department: string | null;
	role: TeamRole;
	invitedAt: string;
	joinedAt: string | null;
	status: 'invited' | 'active' | 'removed';
}

// ─── ORGANIZATION ────────────────────────────────────────────

export interface Organization {
	id: string;
	name: string;
	domain: string | null;
	billingPlanId: string;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	billingCycle: 'monthly' | 'annual';
	createdAt: string;
}

export interface OrgMember {
	id: string;
	orgId: string;
	userId: string;
	role: OrgRole;
	createdAt: string;
}

// ─── ROLE PERMISSIONS ────────────────────────────────────────

export const ROLE_PERMISSIONS = {
	admin: {
		canCreateProject: true,
		canEditProject: true,
		canDeleteProject: true,
		canInviteMembers: true,
		canManageTeam: true,
		canSubmitBrief: true,
		canApproveBrief: false,
		canVotePoll: true,
		canComment: true,
		canUseChat: true,
		canViewDashboard: true,
		canViewExecutiveDashboard: false,
		canExport: true,
		canManageBilling: true,
		canCreatePortalRequest: true
	},
	member: {
		canCreateProject: false,
		canEditProject: true,
		canDeleteProject: false,
		canInviteMembers: false,
		canManageTeam: false,
		canSubmitBrief: false,
		canApproveBrief: false,
		canVotePoll: true,
		canComment: true,
		canUseChat: true,
		canViewDashboard: true,
		canViewExecutiveDashboard: false,
		canExport: false,
		canManageBilling: false,
		canCreatePortalRequest: true
	},
	leadership: {
		canCreateProject: false,
		canEditProject: false,
		canDeleteProject: false,
		canInviteMembers: false,
		canManageTeam: false,
		canSubmitBrief: false,
		canApproveBrief: true,
		canVotePoll: true,
		canComment: true,
		canUseChat: true,
		canViewDashboard: true,
		canViewExecutiveDashboard: true,
		canExport: true,
		canManageBilling: false,
		canCreatePortalRequest: false
	}
} as const;

export type Permission = keyof (typeof ROLE_PERMISSIONS)['admin'];

export function hasPermission(role: TeamRole, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role][permission];
}
