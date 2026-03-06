// ─── BILLING ─────────────────────────────────────────────────

export interface BillingPlan {
	id: string;
	name: string;
	seats: {
		included: number;
		maxSeats: number | 'unlimited';
		pricePerAdditionalSeat: number;
	};
	aiUsage: {
		monthlyCredits: number;
		overageRate: number;
		modelAccess: ('haiku' | 'sonnet' | 'opus')[];
	};
	features: BillingFeatures;
	monthlyPrice: number;
	annualDiscount: number;
}

export interface BillingFeatures {
	maxProjects: number | 'unlimited';
	maxVendorsPerProject: number | 'unlimited';
	collaboration: boolean;
	leadershipRole: boolean;
	integrations: boolean;
	auditTrail: boolean;
	apiAccess: boolean;
	customBranding: boolean;
	sso: boolean;
	multiTeam: boolean;
}

export type BillingFeature = keyof BillingFeatures;
