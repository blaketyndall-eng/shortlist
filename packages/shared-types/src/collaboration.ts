// ─── POLLS ───────────────────────────────────────────────────

export interface Poll {
	id: string;
	projectId: string;
	section: string;
	question: string;
	options: PollOption[];
	createdBy: string;
	createdAt: string;
}

export interface PollOption {
	id: string;
	label: string;
	description?: string;
}

export interface PollResponse {
	id: string;
	pollId: string;
	userId: string;
	selectedOption: string;
	submittedAt: string;
}

// ─── COMMENTS ────────────────────────────────────────────────

export type CommentTargetType = 'vendor' | 'criterion' | 'material' | 'score';

export interface InlineComment {
	id: string;
	projectId: string;
	userId: string;
	targetType: CommentTargetType;
	targetId: string;
	text: string;
	parentId: string | null;
	createdAt: string;
}

// ─── BRIEF APPROVALS ─────────────────────────────────────────

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested';

export interface BriefApproval {
	id: string;
	projectId: string;
	status: ApprovalStatus;
	submittedBy: string;
	submittedAt: string | null;
	reviewedBy: string | null;
	reviewedAt: string | null;
	signOffNote: string | null;
}

export interface BriefComment {
	id: string;
	approvalId: string;
	authorId: string;
	authorRole: string;
	text: string;
	createdAt: string;
}

// ─── NOTIFICATIONS ───────────────────────────────────────────

export type NotificationType =
	| 'brief_submitted'
	| 'brief_approved'
	| 'brief_rejected'
	| 'brief_changes_requested'
	| 'poll_created'
	| 'comment_reply'
	| 'vendor_scored'
	| 'project_completed'
	| 'portal_submitted'
	| 'insight_high_priority'
	| 'member_invited'
	| 'alignment_poll_created'
	| 'alignment_gap_detected'
	| 'briefing_ready'
	| 'briefing_approved';

export interface Notification {
	id: string;
	userId: string;
	type: NotificationType;
	title: string;
	body: string | null;
	projectId: string | null;
	actionUrl: string | null;
	read: boolean;
	createdAt: string;
}

export interface NotificationPreferences {
	userId: string;
	emailEnabled: boolean;
	emailFrequency: 'instant' | 'daily' | 'weekly';
	slackEnabled: boolean;
	slackWebhookUrl: string | null;
	mutedTypes: NotificationType[];
}
