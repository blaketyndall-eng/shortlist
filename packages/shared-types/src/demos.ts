// ─── DEMO SESSIONS ──────────────────────────────────────────

export type DemoStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface DemoAttendee {
	userId: string | null;
	name: string;
	email: string | null;
	role: 'presenter' | 'evaluator' | 'observer' | 'note_taker';
}

export interface DemoAgendaItem {
	id: string;
	topic: string;
	duration: number; // minutes
	presenter: string | null;
	notes: string | null;
}

export interface DemoQuestion {
	id: string;
	question: string;
	category: string;
	priority: 'must_ask' | 'important' | 'if_time';
	asked: boolean;
	answer: string | null;
	rating: number | null; // 1-5 satisfaction
}

export interface PreCallBriefing {
	vendorSummary: string;
	keyFocusAreas: string[];
	questionsToAsk: DemoQuestion[];
	competitorComparison: string | null;
	warningFlags: string[];
	preparedBy: 'ai' | 'user';
	generatedAt: string;
}

export interface DemoSession {
	id: string;
	projectId: string;
	vendorId: string;
	title: string;
	scheduledAt: string | null;
	durationMinutes: number;
	status: DemoStatus;
	meetingLink: string | null;
	attendees: DemoAttendee[];
	preCallBriefing: PreCallBriefing | null;
	agenda: DemoAgendaItem[];
	questions: DemoQuestion[];
	notes: string | null;
	recordingUrl: string | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

// ─── DEMO FEEDBACK ──────────────────────────────────────────

export interface CategoryScore {
	category: string;
	score: number; // 1-10
	notes: string | null;
}

export interface ClaimVerification {
	claimId: string;
	claim: string;
	verified: boolean | null;
	evidence: string | null;
}

export interface DemoFeedback {
	id: string;
	demoSessionId: string;
	userId: string;
	overallRating: number | null; // 1-10
	categoryScores: CategoryScore[];
	strengths: string[];
	concerns: string[];
	questionsAnswered: { questionId: string; satisfaction: number }[];
	claimsVerified: ClaimVerification[];
	recommendAdvance: boolean | null;
	notes: string | null;
	submittedAt: string;
}
