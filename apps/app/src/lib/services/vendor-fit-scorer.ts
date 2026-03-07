/**
 * Vendor Fit Scorer
 * Calculates a 0-100 "fit score" for each vendor against a buyer's
 * company profile, problem statement, and project constraints.
 *
 * Uses a weighted multi-signal approach:
 * - Problem alignment (35%): How well the vendor solves the stated problem
 * - Size/tier match (15%): Does the vendor serve this buyer's segment
 * - Budget fit (15%): Does pricing align with budget
 * - Feature overlap (15%): How many needed features does the vendor cover
 * - Compliance match (10%): Does the vendor meet compliance requirements
 * - Integration fit (10%): Does the vendor integrate with existing stack
 */

interface BuyerProfile {
	industry?: string;
	size?: string;
	budget?: string;
	compliance?: string[];
	priorities?: string[];
	stack?: string;
	vendorPref?: string[];
	regions?: string[];
}

interface ProjectContext {
	problem?: string;
	category?: string;
	teamSize?: string;
	budget?: string;
	existingTool?: string;
	approach?: string;
}

interface VendorRecord {
	id: string;
	name: string;
	slug: string;
	category_id: string;
	tier?: string;
	size?: string;
	best_for?: string;
	tagline?: string;
	description?: string;
	features?: string[];
	compliance_certs?: string[];
	pricing_starts_at?: string;
	free_trial_days?: number;
	integration_count?: number;
	employee_range?: string;
	ai_overview?: string;
	ai_strengths?: string[];
	ai_pricing?: string;
	ai_pricing_model?: string;
	ai_target_segments?: string[];
	ai_key_integrations?: string[];
	ai_security_certs?: string[];
	ai_deployment_model?: string;
	enrichment_status?: string;
}

export interface FitScore {
	vendorId: string;
	vendorName: string;
	totalScore: number; // 0-100
	breakdown: {
		problemAlignment: number; // 0-100
		sizeMatch: number;
		budgetFit: number;
		featureOverlap: number;
		complianceMatch: number;
		integrationFit: number;
	};
	signals: string[]; // Human-readable fit signals
	concerns: string[]; // Potential mismatches
}

// Budget ranges in annual USD for comparison
const BUDGET_RANGES: Record<string, [number, number]> = {
	'Under $10k': [0, 10000],
	'$10k-$50k': [10000, 50000],
	'$50k-$100k': [50000, 100000],
	'$100k-$500k': [100000, 500000],
	'$500k-$1M': [500000, 1000000],
	'$1M+': [1000000, 10000000],
};

// Company size alignment matrix
const SIZE_ALIGNMENT: Record<string, string[]> = {
	'1-10': ['smb', 'startup', 'free', 'all'],
	'11-50': ['smb', 'startup', 'mid-market', 'all'],
	'51-200': ['smb', 'mid-market', 'all'],
	'201-500': ['mid-market', 'enterprise', 'all'],
	'501-1000': ['mid-market', 'enterprise', 'all'],
	'1001-5000': ['enterprise', 'all'],
	'5000+': ['enterprise', 'all'],
};

/**
 * Score a single vendor against buyer profile and project context
 */
export function scoreVendorFit(
	vendor: VendorRecord,
	buyer: BuyerProfile,
	project: ProjectContext
): FitScore {
	const signals: string[] = [];
	const concerns: string[] = [];

	// 1. Problem Alignment (35%) — keyword + semantic matching
	const problemScore = scoreProblemAlignment(vendor, project, signals, concerns);

	// 2. Size/Tier Match (15%)
	const sizeScore = scoreSizeMatch(vendor, buyer, signals, concerns);

	// 3. Budget Fit (15%)
	const budgetScore = scoreBudgetFit(vendor, buyer, project, signals, concerns);

	// 4. Feature Overlap (15%)
	const featureScore = scoreFeatureOverlap(vendor, buyer, signals, concerns);

	// 5. Compliance Match (10%)
	const complianceScore = scoreComplianceMatch(vendor, buyer, signals, concerns);

	// 6. Integration Fit (10%)
	const integrationScore = scoreIntegrationFit(vendor, buyer, signals, concerns);

	// Weighted total
	const totalScore = Math.round(
		problemScore * 0.35 +
		sizeScore * 0.15 +
		budgetScore * 0.15 +
		featureScore * 0.15 +
		complianceScore * 0.10 +
		integrationScore * 0.10
	);

	return {
		vendorId: vendor.id,
		vendorName: vendor.name,
		totalScore: Math.min(100, Math.max(0, totalScore)),
		breakdown: {
			problemAlignment: problemScore,
			sizeMatch: sizeScore,
			budgetFit: budgetScore,
			featureOverlap: featureScore,
			complianceMatch: complianceScore,
			integrationFit: integrationScore,
		},
		signals,
		concerns,
	};
}

/**
 * Score and rank multiple vendors against a buyer profile
 */
export function rankVendorsByFit(
	vendors: VendorRecord[],
	buyer: BuyerProfile,
	project: ProjectContext
): FitScore[] {
	return vendors
		.map((v) => scoreVendorFit(v, buyer, project))
		.sort((a, b) => b.totalScore - a.totalScore);
}

// ============================================================
// Individual scoring functions
// ============================================================

function scoreProblemAlignment(
	vendor: VendorRecord,
	project: ProjectContext,
	signals: string[],
	concerns: string[]
): number {
	let score = 50; // Neutral baseline

	// Category match is a strong signal
	if (project.category && vendor.category_id) {
		const catMatch = project.category.toLowerCase().includes(vendor.category_id.replace(/-/g, ' ')) ||
			vendor.category_id.replace(/-/g, ' ').includes(project.category.toLowerCase());
		if (catMatch) {
			score += 20;
			signals.push(`Category match: ${vendor.category_id}`);
		} else {
			score -= 15;
			concerns.push(`Different category (${vendor.category_id} vs ${project.category})`);
		}
	}

	// Keyword matching against problem statement
	if (project.problem) {
		const problemWords = extractKeywords(project.problem);
		const vendorText = [
			vendor.tagline, vendor.description, vendor.best_for,
			vendor.ai_overview, ...(vendor.features ?? []),
		].filter(Boolean).join(' ').toLowerCase();

		const matchCount = problemWords.filter((w) => vendorText.includes(w)).length;
		const matchRatio = problemWords.length > 0 ? matchCount / problemWords.length : 0;

		if (matchRatio > 0.3) {
			score += Math.round(matchRatio * 30);
			signals.push(`Strong problem-to-feature alignment (${Math.round(matchRatio * 100)}%)`);
		}
	}

	// Best-for alignment
	if (vendor.best_for && project.problem) {
		const bestForWords = extractKeywords(vendor.best_for);
		const problemWords = extractKeywords(project.problem);
		const overlap = bestForWords.filter((w) => problemWords.some((pw) => w.includes(pw) || pw.includes(w)));
		if (overlap.length > 0) {
			score += 10;
			signals.push(`Vendor best-for aligns: "${vendor.best_for}"`);
		}
	}

	// AI enrichment bonus — enriched vendors get more trustworthy scores
	if (vendor.enrichment_status === 'enriched') {
		score += 5;
	}

	return Math.min(100, Math.max(0, score));
}

function scoreSizeMatch(
	vendor: VendorRecord,
	buyer: BuyerProfile,
	signals: string[],
	concerns: string[]
): number {
	if (!buyer.size || !vendor.tier) return 60; // Default neutral

	const alignedTiers = SIZE_ALIGNMENT[buyer.size] ?? ['all'];
	const vendorTier = vendor.tier.toLowerCase();

	if (alignedTiers.includes(vendorTier) || vendorTier === 'all') {
		signals.push(`${vendor.tier} tier fits ${buyer.size} company`);
		return 85;
	}

	// Partial match
	if (vendorTier === 'enterprise' && buyer.size && parseInt(buyer.size) < 200) {
		concerns.push(`Enterprise vendor may be overkill for ${buyer.size} employees`);
		return 40;
	}
	if (vendorTier === 'smb' && buyer.size && (buyer.size.includes('5000') || buyer.size.includes('1001'))) {
		concerns.push(`SMB tool may not scale to ${buyer.size} employees`);
		return 35;
	}

	return 55;
}

function scoreBudgetFit(
	vendor: VendorRecord,
	buyer: BuyerProfile,
	project: ProjectContext,
	signals: string[],
	concerns: string[]
): number {
	const budgetStr = project.budget || buyer.budget;
	if (!budgetStr) return 60;

	const budgetRange = BUDGET_RANGES[budgetStr];
	if (!budgetRange) return 60;

	// Try to parse vendor pricing
	const pricingText = (vendor.pricing_starts_at ?? vendor.ai_pricing ?? '').toLowerCase();
	if (!pricingText) return 55;

	// Check for free tier
	if (pricingText.includes('free') && budgetRange[0] === 0) {
		signals.push('Free tier available — fits tight budget');
		return 90;
	}

	// Extract price from text
	const priceMatch = pricingText.match(/\$(\d[\d,]*)/);
	if (priceMatch) {
		const monthlyPrice = parseInt(priceMatch[1].replace(',', ''));
		const annualEstimate = monthlyPrice * 12 * (parseInt(buyer.size?.split('-')[0] ?? '10') || 10);

		if (annualEstimate <= budgetRange[1]) {
			signals.push(`Pricing (from ${vendor.pricing_starts_at}) fits within ${budgetStr} budget`);
			return 80;
		} else if (annualEstimate <= budgetRange[1] * 1.5) {
			concerns.push(`Pricing may stretch budget (${vendor.pricing_starts_at})`);
			return 55;
		} else {
			concerns.push(`Likely over budget (${vendor.pricing_starts_at} for team of ${buyer.size})`);
			return 30;
		}
	}

	// Custom/enterprise pricing with large budget
	if (pricingText.includes('custom') || pricingText.includes('contact')) {
		if (budgetRange[0] >= 100000) {
			signals.push('Custom pricing — appropriate for large budget');
			return 70;
		} else {
			concerns.push('Custom pricing — may exceed budget');
			return 45;
		}
	}

	return 55;
}

function scoreFeatureOverlap(
	vendor: VendorRecord,
	buyer: BuyerProfile,
	signals: string[],
	concerns: string[]
): number {
	if (!buyer.priorities?.length) return 60;

	const vendorFeatures = [
		...(vendor.features ?? []),
		...(vendor.ai_strengths ?? []),
	].map((f) => (typeof f === 'string' ? f.toLowerCase() : '')).filter(Boolean);

	if (vendorFeatures.length === 0) return 50;

	const priorityWords = buyer.priorities.flatMap((p) => extractKeywords(p));
	let matchCount = 0;

	for (const pw of priorityWords) {
		if (vendorFeatures.some((f) => f.includes(pw))) {
			matchCount++;
		}
	}

	const matchRatio = priorityWords.length > 0 ? matchCount / priorityWords.length : 0;

	if (matchRatio > 0.4) {
		signals.push(`Covers ${Math.round(matchRatio * 100)}% of your priorities`);
		return Math.min(95, 60 + Math.round(matchRatio * 40));
	}

	if (matchRatio > 0.15) return 55;

	return 40;
}

function scoreComplianceMatch(
	vendor: VendorRecord,
	buyer: BuyerProfile,
	signals: string[],
	concerns: string[]
): number {
	if (!buyer.compliance?.length) return 70; // No requirements = fine

	const vendorCerts = [
		...(vendor.compliance_certs ?? []),
		...(vendor.ai_security_certs ?? []),
	].map((c) => (typeof c === 'string' ? c.toLowerCase() : '')).filter(Boolean);

	if (vendorCerts.length === 0) {
		concerns.push('No compliance certifications listed');
		return 30;
	}

	const required = buyer.compliance.map((c) => c.toLowerCase());
	const met = required.filter((r) =>
		vendorCerts.some((vc) => vc.includes(r) || r.includes(vc))
	);

	if (met.length === required.length) {
		signals.push(`Meets all compliance requirements (${met.join(', ')})`);
		return 95;
	}

	if (met.length > 0) {
		const missing = required.filter((r) => !met.includes(r));
		concerns.push(`Missing compliance: ${missing.join(', ')}`);
		return 40 + Math.round((met.length / required.length) * 50);
	}

	concerns.push(`No matching compliance certs (needs: ${required.join(', ')})`);
	return 20;
}

function scoreIntegrationFit(
	vendor: VendorRecord,
	buyer: BuyerProfile,
	signals: string[],
	concerns: string[]
): number {
	if (!buyer.stack) return 60;

	const stackTools = buyer.stack.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
	if (stackTools.length === 0) return 60;

	const vendorIntegrations = [
		...(vendor.ai_key_integrations ?? []),
	].map((i) => (typeof i === 'string' ? i.toLowerCase() : '')).filter(Boolean);

	// Also check integration count
	const intCount = vendor.integration_count ?? 0;

	if (vendorIntegrations.length > 0) {
		const matched = stackTools.filter((st) =>
			vendorIntegrations.some((vi) => vi.includes(st) || st.includes(vi))
		);

		if (matched.length > 0) {
			signals.push(`Integrates with ${matched.join(', ')} from your stack`);
			return 70 + Math.min(25, matched.length * 8);
		}
	}

	// Fall back to integration count as a proxy
	if (intCount > 500) {
		signals.push(`${intCount}+ integrations — likely covers your stack`);
		return 70;
	}
	if (intCount > 100) return 55;

	return 40;
}

// ============================================================
// Helpers
// ============================================================

const STOP_WORDS = new Set([
	'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
	'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
	'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
	'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
	'that', 'this', 'these', 'those', 'it', 'its', 'we', 'our', 'us', 'them',
	'they', 'their', 'not', 'no', 'nor', 'so', 'up', 'out', 'if', 'about',
	'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
	'same', 'some', 'all', 'most', 'other', 'each', 'few', 'more', 'many',
	'such', 'only', 'also', 'very', 'just', 'than', 'too', 'any', 'every',
	'want', 'looking', 'need', 'like', 'get', 'make',
]);

function extractKeywords(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.split(/\s+/)
		.filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}
