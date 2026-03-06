// ─── VENDOR INTELLIGENCE LIBRARY ─────────────────────────────

export interface VendorProfile {
	id: string;
	name: string;
	legalName: string | null;
	domain: string;
	alternativeDomains: string[];
	logoUrl: string | null;
	description: string | null;
	tagline: string | null;

	// Classification
	category: string;
	subcategories: string[];
	targetMarket: ('smb' | 'mid_market' | 'enterprise')[];
	industries: string[];

	// Company details
	foundedYear: number | null;
	headquarters: string | null;
	employeeRange: string | null;
	fundingStage: string | null;
	totalFunding: number | null;
	publiclyTraded: boolean;
	tickerSymbol: string | null;

	// Scoring (AI-computed)
	overallScore: number | null;
	scoreBreakdown: Record<string, number>;
	peerRanking: number | null;
	peerGroupSize: number | null;

	// Pricing
	pricingModel: string | null;
	pricingStartsAt: string | null;
	freeTrialDays: number | null;
	freeTierAvailable: boolean;

	// Compliance
	complianceCerts: string[];

	// Metadata
	dataConfidence: Record<string, number>;
	lastFullRefresh: string | null;
	sources: string[];
	version: number;
	createdAt: string;
	updatedAt: string;
}

// ─── TEAM VENDOR OVERLAY ─────────────────────────────────────

export interface TeamVendorOverlay {
	id: string;
	teamId: string;
	vendorProfileId: string;
	internalNotes: string | null;
	relationshipStatus: 'prospect' | 'active_eval' | 'current_vendor' | 'former_vendor' | 'blacklisted' | null;
	contractEndDate: string | null;
	negotiatedPricing: Record<string, unknown> | null;
	internalRating: number | null;
	tags: string[];
	customFields: Record<string, unknown>;
	updatedAt: string;
}

// ─── VENDOR PORTAL ───────────────────────────────────────────

export type PortalRequestType =
	| 'questionnaire'
	| 'document_upload'
	| 'link_submission'
	| 'presentation_upload'
	| 'security_questionnaire';

export type DocumentType =
	| 'msa'
	| 'nda'
	| 'sow'
	| 'data_sheet'
	| 'one_pager'
	| 'pitch_deck'
	| 'case_study'
	| 'security_cert'
	| 'pricing_sheet'
	| 'integration_docs'
	| 'other';

export type PortalStatus =
	| 'pending'
	| 'sent'
	| 'viewed'
	| 'in_progress'
	| 'submitted'
	| 'expired';

export interface PortalQuestion {
	id: string;
	question: string;
	type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date' | 'file';
	required: boolean;
	options?: string[];
	placeholder?: string;
	maxLength?: number;
}

export interface VendorPortalRequest {
	id: string;
	projectId: string;
	vendorId: string;
	teamId: string;
	createdBy: string;
	requestTypes: PortalRequestType[];
	questions: PortalQuestion[];
	documentTypes: DocumentType[];
	instructions: string | null;
	vendorContactEmail: string;
	vendorContactName: string | null;
	vendorCompanyName: string;
	portalTokenHash: string;
	expiresAt: string;
	maxAccessCount: number | null;
	status: PortalStatus;
	sentAt: string | null;
	viewedAt: string | null;
	submittedAt: string | null;
	response: VendorPortalResponse | null;
	accessLog: PortalAccessEvent[];
	createdAt: string;
	updatedAt: string;
}

export interface VendorPortalResponse {
	answers: { questionId: string; value: unknown }[];
	documents: PortalDocument[];
	links: { label: string; url: string; description?: string }[];
	notes: string | null;
	submittedAt: string;
}

export interface PortalDocument {
	id: string;
	fileName: string;
	fileType: string;
	fileSize: number;
	documentType: DocumentType;
	storagePath: string;
	encryptedAtRest: boolean;
	uploadedAt: string;
	checksum: string;
}

export interface PortalAccessEvent {
	timestamp: string;
	ipAddress: string;
	userAgent: string;
	action: 'viewed' | 'downloaded_doc' | 'submitted';
}
