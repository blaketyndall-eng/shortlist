import { createAdminSupabase } from '$services/supabase.server';
import { env } from '$env/dynamic/private';

/**
 * Vendor Hunter Service v2
 * Premier intelligence engine that gathers data from multiple sources
 * and writes enrichment proposals to the vendor_enrichment_queue
 * with per-field confidence scores and quality signals.
 *
 * Sources: AI deep research (Claude Sonnet), web intelligence
 * Pipeline: Hunter → Queue → Moderator → Apply
 */

interface EnrichmentOptions {
	/** Whether to run the moderator after enrichment (default: true) */
	runModerator?: boolean;
	/** Force re-enrichment even if recently enriched */
	force?: boolean;
}

interface EnrichmentProposal {
	vendor_id: string;
	source: string;
	field_name: string;
	proposed_value: unknown;
	confidence: number;
}

interface AIResearchResult {
	overview?: string;
	typicalPricing?: string;
	pricingModel?: string;
	knownStrengths?: string[];
	knownWeaknesses?: string[];
	implementationComplexity?: string;
	implementationNote?: string;
	implementationTimeline?: string;
	g2Position?: string;
	watchOutFor?: string[];
	competitors?: string[];
	targetCustomerSegments?: string[];
	keyIntegrations?: string[];
	securityCertifications?: string[];
	contractTerms?: string;
	deploymentModel?: string;
	supportModel?: string;
	vendorStability?: string;
}

// Base confidence scores by source and field type
// Higher confidence = more factual/verifiable data
const CONFIDENCE_BASE: Record<string, Record<string, number>> = {
	ai_research: {
		ai_overview: 0.72,
		ai_pricing: 0.65,
		ai_pricing_model: 0.68,
		ai_strengths: 0.68,
		ai_concerns: 0.68,
		ai_impl_complexity: 0.72,
		ai_impl_note: 0.68,
		ai_impl_timeline: 0.60,
		ai_g2_position: 0.62,
		ai_watch_out_for: 0.65,
		ai_competitors: 0.75,
		ai_target_segments: 0.70,
		ai_key_integrations: 0.72,
		ai_security_certs: 0.65,
		ai_contract_terms: 0.58,
		ai_deployment_model: 0.75,
		ai_support_model: 0.65,
		ai_vendor_stability: 0.60,
	},
	clay: {
		website: 0.95,
		hq_location: 0.90,
		employee_range: 0.90,
		funding_stage: 0.90,
		description: 0.85,
		size: 0.85,
	},
};

/**
 * Enrich a single vendor — main entry point
 * Uses platform env.ANTHROPIC_API_KEY exclusively (no user keys).
 * @param vendorId - UUID of the vendor to enrich
 */
export async function enrichVendor(vendorId: string): Promise<{
	proposals: number;
	errors: string[];
}> {
	const supabase = createAdminSupabase();
	const apiKey = env.ANTHROPIC_API_KEY || null;

	// Load vendor
	const { data: vendor, error: vErr } = await supabase
		.from('vendor_library')
		.select('*')
		.eq('id', vendorId)
		.single();

	if (vErr || !vendor) {
		return { proposals: 0, errors: [`Vendor not found: ${vendorId}`] };
	}

	// Skip if already enriched recently (within 7 days) unless forced
	if (vendor.enrichment_status === 'enriched' && vendor.enriched_at) {
		const daysSinceEnriched = (Date.now() - new Date(vendor.enriched_at).getTime()) / (1000 * 60 * 60 * 24);
		if (daysSinceEnriched < 7) {
			return { proposals: 0, errors: [] }; // Skip — recently enriched
		}
	}

	// Mark as enriching
	await supabase
		.from('vendor_library')
		.update({ enrichment_status: 'enriching' })
		.eq('id', vendorId);

	const proposals: EnrichmentProposal[] = [];
	const errors: string[] = [];

	// Run AI research
	try {
		const aiResult = await enrichFromAI(vendor, apiKey);
		if (aiResult) {
			const aiProposals = mapAIResultToProposals(vendorId, aiResult);
			proposals.push(...aiProposals);
		}
	} catch (err: any) {
		errors.push(`AI research failed: ${err.message}`);
	}

	// Write proposals to queue
	if (proposals.length > 0) {
		const rows = proposals.map((p) => ({
			vendor_id: p.vendor_id,
			source: p.source,
			field_name: p.field_name,
			proposed_value: JSON.stringify(p.proposed_value),
			confidence: p.confidence,
			status: 'pending',
		}));

		const { error: qErr } = await supabase
			.from('vendor_enrichment_queue')
			.insert(rows);

		if (qErr) {
			errors.push(`Queue insert failed: ${qErr.message}`);
		}
	}

	// Update enrichment status
	await supabase
		.from('vendor_library')
		.update({
			enrichment_status: errors.length > 0 && proposals.length === 0 ? 'failed' : 'enriching',
		})
		.eq('id', vendorId);

	return { proposals: proposals.length, errors };
}

/**
 * Enrich vendor using AI (Claude) deep research
 * Uses Sonnet for comprehensive vendor analysis with structured output.
 * Includes retry logic and quality validation.
 *
 * @param vendor - The vendor record from DB
 * @param apiKey - Anthropic API key (platform or user-provided)
 */
async function enrichFromAI(vendor: Record<string, unknown>, apiKey: string | null): Promise<AIResearchResult | null> {
	if (!apiKey) return null;

	const systemPrompt = `You are a senior B2B software purchase intelligence analyst with deep expertise in vendor evaluation, market positioning, and total cost of ownership analysis. You work for Shortlist, a premier purchase intelligence platform.

Your task is to provide thorough, accurate vendor intelligence. Be specific with numbers, names, and facts. Avoid generic statements. If you're unsure about something, say so rather than guessing.

CRITICAL: Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON object.`;

	const categoryLabel = vendor.category_id ? String(vendor.category_id).replace(/-/g, ' ') : 'software';

	const userPrompt = `Conduct a comprehensive analysis of "${vendor.name}" for B2B ${categoryLabel} evaluation.

Known context:
- Website: ${vendor.website ?? 'unknown'}
- Category: ${categoryLabel}
- Tagline: ${vendor.tagline ?? 'N/A'}
- Best for: ${vendor.best_for ?? 'N/A'}
- Tier: ${vendor.tier ?? 'N/A'}
- Employee range: ${vendor.employee_range ?? 'unknown'}
- Founded: ${vendor.founded ?? 'unknown'}
- HQ: ${vendor.hq_location ?? 'unknown'}
- Funding: ${vendor.funding_stage ?? 'unknown'}

Return a JSON object with ALL of these fields (use null for genuinely unknown info):
{
  "overview": "3-4 sentence executive summary covering what they do, who they serve, and their market position",
  "typicalPricing": "specific pricing ranges with tiers (e.g. 'Starts at $25/user/month for basic, $65/user/month for professional, enterprise pricing from $150/user/month')",
  "pricingModel": "per-seat|per-usage|flat-rate|tiered|custom-quote|freemium|open-source",
  "knownStrengths": ["strength 1 with specific detail", "strength 2", "strength 3", "strength 4"],
  "knownWeaknesses": ["weakness 1 with specific detail", "weakness 2", "weakness 3"],
  "implementationComplexity": "low|medium|high",
  "implementationNote": "2-sentence implementation reality check including typical timeline",
  "implementationTimeline": "typical timeline range (e.g. '2-4 weeks for basic, 2-3 months for enterprise')",
  "g2Position": "market position summary including approximate G2 rating if known (e.g. 'Leader in G2 Grid for CRM with 4.5/5 stars, 2000+ reviews')",
  "watchOutFor": ["specific contract/pricing gotcha 1", "gotcha 2"],
  "competitors": ["competitor 1", "competitor 2", "competitor 3", "competitor 4", "competitor 5"],
  "targetCustomerSegments": ["segment 1 (e.g. 'Mid-market SaaS companies 50-500 employees')", "segment 2"],
  "keyIntegrations": ["integration 1", "integration 2", "integration 3", "integration 4", "integration 5"],
  "securityCertifications": ["cert 1 (e.g. 'SOC 2 Type II')", "cert 2"],
  "contractTerms": "typical contract structure (annual vs monthly, minimum commitment, cancellation terms)",
  "deploymentModel": "cloud-only|on-premise|hybrid|self-hosted",
  "supportModel": "support tiers and typical response times",
  "vendorStability": "assessment of vendor financial health, funding, growth trajectory, and acquisition risk"
}

Be as specific as possible. Use real numbers, real competitor names, real integration names. For pricing, give actual ranges not vague descriptions.`;

	// Attempt with retry (1 retry on failure)
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
				},
				body: JSON.stringify({
					model: 'claude-sonnet-4-6',
					max_tokens: 2048,
					system: systemPrompt,
					messages: [{ role: 'user', content: userPrompt }],
				}),
			});

			if (!response.ok) {
				if (attempt === 0 && response.status >= 500) continue; // Retry on server error
				return null;
			}

			const data = await response.json();
			const text = data.content?.[0]?.text ?? '';
			const cleaned = text.replace(/```json\n?|```/g, '').trim();

			try {
				const result = JSON.parse(cleaned) as AIResearchResult;
				// Quality gate: must have at least overview and some strengths
				if (!result.overview || !result.knownStrengths?.length) {
					if (attempt === 0) continue; // Retry if quality too low
					return result; // Return partial on second attempt
				}
				return result;
			} catch {
				if (attempt === 0) continue; // Retry on parse failure
				return null;
			}
		} catch {
			if (attempt === 0) continue;
			return null;
		}
	}

	return null;
}

/**
 * Map AI research result to enrichment proposals.
 * Applies quality-based confidence adjustments:
 * - Longer, more detailed responses get a confidence boost
 * - Very short/generic responses get a penalty
 */
function mapAIResultToProposals(
	vendorId: string,
	result: AIResearchResult
): EnrichmentProposal[] {
	const proposals: EnrichmentProposal[] = [];
	const bases = CONFIDENCE_BASE.ai_research;

	// Helper: adjust confidence based on content quality
	const adjustConfidence = (base: number, value: unknown): number => {
		if (typeof value === 'string') {
			// Penalize very short responses, boost detailed ones
			if (value.length < 20) return Math.max(base - 0.08, 0.40);
			if (value.length > 100) return Math.min(base + 0.05, 0.92);
		}
		if (Array.isArray(value)) {
			if (value.length >= 4) return Math.min(base + 0.05, 0.92);
			if (value.length <= 1) return Math.max(base - 0.05, 0.40);
		}
		return base;
	};

	// Helper: add proposal if value exists
	const addProposal = (field: string, value: unknown) => {
		if (value === null || value === undefined) return;
		if (typeof value === 'string' && !value.trim()) return;
		if (Array.isArray(value) && value.length === 0) return;

		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: field,
			proposed_value: value,
			confidence: adjustConfidence(bases[field] ?? 0.60, value),
		});
	};

	// Core intelligence fields
	addProposal('ai_overview', result.overview);
	addProposal('ai_pricing', result.typicalPricing);
	addProposal('ai_pricing_model', result.pricingModel);
	addProposal('ai_strengths', result.knownStrengths);
	addProposal('ai_concerns', result.knownWeaknesses);
	addProposal('ai_impl_complexity', result.implementationComplexity);
	addProposal('ai_impl_note', result.implementationNote);
	addProposal('ai_impl_timeline', result.implementationTimeline);
	addProposal('ai_g2_position', result.g2Position);
	addProposal('ai_watch_out_for', result.watchOutFor);
	addProposal('ai_competitors', result.competitors);

	// Extended intelligence fields (new in v2)
	addProposal('ai_target_segments', result.targetCustomerSegments);
	addProposal('ai_key_integrations', result.keyIntegrations);
	addProposal('ai_security_certs', result.securityCertifications);
	addProposal('ai_contract_terms', result.contractTerms);
	addProposal('ai_deployment_model', result.deploymentModel);
	addProposal('ai_support_model', result.supportModel);
	addProposal('ai_vendor_stability', result.vendorStability);

	return proposals;
}

/**
 * Batch enrich multiple vendors (concurrent with limit)
 */
export async function enrichBatch(
	vendorIds: string[],
	concurrency = 3
): Promise<{ total: number; succeeded: number; failed: number }> {
	let succeeded = 0;
	let failed = 0;

	// Process in chunks
	for (let i = 0; i < vendorIds.length; i += concurrency) {
		const chunk = vendorIds.slice(i, i + concurrency);
		const results = await Promise.allSettled(
			chunk.map((id) => enrichVendor(id))
		);

		for (const r of results) {
			if (r.status === 'fulfilled') {
				if (r.value.proposals > 0) {
					succeeded++;
				}
				// Fulfilled with 0 proposals is neither succeeded nor failed - it's skipped
			} else {
				// rejected status
				failed++;
			}
		}
	}

	return { total: vendorIds.length, succeeded, failed };
}

/**
 * Auto-enrich all vendors with 'pending' or 'failed' status.
 * Designed for cron/scheduled jobs — uses platform env.ANTHROPIC_API_KEY only.
 * Processes in batches to stay within API rate limits.
 *
 * @param limit - Max vendors to process per run (default: 20)
 */
export async function autoEnrichPending(
	limit = 20
): Promise<{ total: number; succeeded: number; failed: number; skipped: number }> {
	const supabase = createAdminSupabase();

	// Find all vendors that need enrichment
	const { data: pending, error: pErr } = await supabase
		.from('vendor_library')
		.select('id')
		.in('enrichment_status', ['pending', 'failed'])
		.order('created_at', { ascending: true })
		.limit(limit);

	if (pErr || !pending?.length) {
		return { total: 0, succeeded: 0, failed: 0, skipped: 0 };
	}

	const vendorIds = pending.map((v) => v.id);
	const result = await enrichBatch(vendorIds, 3);

	return { ...result, skipped: 0 };
}

/**
 * Re-enrich vendors that haven't been refreshed in a given number of days.
 * Resets their status to 'pending' so the next autoEnrichPending run picks them up.
 *
 * @param staleDays - Days since last enrichment before re-enriching (default: 30)
 * @param limit - Max vendors to reset per run (default: 10)
 * @param trustTier - Optional trust tier filter for tiered refresh cycles
 */
export async function markStaleForReenrich(
	staleDays = 30,
	limit = 10,
	trustTier?: string
): Promise<{ marked: number }> {
	const supabase = createAdminSupabase();
	const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

	let query = supabase
		.from('vendor_library')
		.select('id')
		.eq('enrichment_status', 'enriched')
		.lt('enriched_at', cutoff)
		.order('enriched_at', { ascending: true })
		.limit(limit);

	if (trustTier) {
		query = query.eq('trust_tier', trustTier);
	}

	const { data: stale, error: sErr } = await query;

	if (sErr || !stale?.length) {
		return { marked: 0 };
	}

	const ids = stale.map((v) => v.id);
	const { error: updateErr } = await supabase
		.from('vendor_library')
		.update({ enrichment_status: 'pending' })
		.in('id', ids);

	if (updateErr) {
		console.error(`Failed to mark stale vendors for re-enrichment: ${updateErr.message}`);
		return { marked: 0 };
	}

	return { marked: ids.length };
}
