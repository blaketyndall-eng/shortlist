import { createAdminSupabase } from '$services/supabase.server';
import { ANTHROPIC_API_KEY } from '$env/static/private';

/**
 * Vendor Hunter Service
 * Gathers intelligence from multiple sources and writes enrichment proposals
 * to the vendor_enrichment_queue with per-field confidence scores.
 *
 * Supports automatic enrichment with platform API key and optional
 * user-provided API key override for backup/custom usage.
 */

interface EnrichmentOptions {
	/** Whether to run the moderator after enrichment (default: true) */
	runModerator?: boolean;
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
	knownStrengths?: string[];
	knownWeaknesses?: string[];
	implementationComplexity?: string;
	implementationNote?: string;
	g2Position?: string;
	watchOutFor?: string[];
	competitors?: string[];
}

// Base confidence scores by source and field type
const CONFIDENCE_BASE: Record<string, Record<string, number>> = {
	ai_research: {
		ai_overview: 0.70,
		ai_pricing: 0.65,
		ai_strengths: 0.65,
		ai_concerns: 0.65,
		ai_impl_complexity: 0.70,
		ai_impl_note: 0.65,
		ai_g2_position: 0.60,
		ai_watch_out_for: 0.60,
		ai_competitors: 0.70,
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
 * Uses platform ANTHROPIC_API_KEY exclusively (no user keys).
 * @param vendorId - UUID of the vendor to enrich
 */
export async function enrichVendor(vendorId: string): Promise<{
	proposals: number;
	errors: string[];
}> {
	const supabase = createAdminSupabase();
	const apiKey = ANTHROPIC_API_KEY || null;

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
 * Enrich vendor using AI (Claude) research
 * @param vendor - The vendor record from DB
 * @param apiKey - Anthropic API key (platform or user-provided)
 */
async function enrichFromAI(vendor: Record<string, unknown>, apiKey: string | null): Promise<AIResearchResult | null> {
	if (!apiKey) return null;

	const systemPrompt = 'You are a B2B software analyst. Return ONLY valid JSON, no markdown.';
	const userPrompt = `Research "${vendor.name}" for a ${vendor.category_id} evaluation. Return JSON:
{"overview":"2-sentence summary","typicalPricing":"pricing model and range","knownStrengths":["s1","s2","s3"],"knownWeaknesses":["w1","w2"],"implementationComplexity":"low|medium|high","implementationNote":"one sentence","g2Position":"brief positioning","watchOutFor":["top contract gotcha or concern"],"competitors":["c1","c2","c3"]}

Context about this vendor:
- Website: ${vendor.website ?? 'unknown'}
- Category: ${vendor.category_id}
- Tagline: ${vendor.tagline ?? ''}
- Best for: ${vendor.best_for ?? ''}
- Tier: ${vendor.tier ?? ''}`;

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-6',
			max_tokens: 1024,
			system: systemPrompt,
			messages: [{ role: 'user', content: userPrompt }],
		}),
	});

	if (!response.ok) return null;

	const data = await response.json();
	const text = data.content?.[0]?.text ?? '';
	const cleaned = text.replace(/```json\n?|```/g, '').trim();

	try {
		return JSON.parse(cleaned) as AIResearchResult;
	} catch {
		return null;
	}
}

/**
 * Map AI research result to enrichment proposals
 */
function mapAIResultToProposals(
	vendorId: string,
	result: AIResearchResult
): EnrichmentProposal[] {
	const proposals: EnrichmentProposal[] = [];
	const bases = CONFIDENCE_BASE.ai_research;

	if (result.overview) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_overview',
			proposed_value: result.overview,
			confidence: bases.ai_overview,
		});
	}

	if (result.typicalPricing) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_pricing',
			proposed_value: result.typicalPricing,
			confidence: bases.ai_pricing,
		});
	}

	if (result.knownStrengths?.length) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_strengths',
			proposed_value: result.knownStrengths,
			confidence: bases.ai_strengths,
		});
	}

	if (result.knownWeaknesses?.length) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_concerns',
			proposed_value: result.knownWeaknesses,
			confidence: bases.ai_concerns,
		});
	}

	if (result.implementationComplexity) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_impl_complexity',
			proposed_value: result.implementationComplexity,
			confidence: bases.ai_impl_complexity,
		});
	}

	if (result.implementationNote) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_impl_note',
			proposed_value: result.implementationNote,
			confidence: bases.ai_impl_note,
		});
	}

	if (result.g2Position) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_g2_position',
			proposed_value: result.g2Position,
			confidence: bases.ai_g2_position,
		});
	}

	if (result.watchOutFor?.length) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_watch_out_for',
			proposed_value: result.watchOutFor,
			confidence: bases.ai_watch_out_for,
		});
	}

	if (result.competitors?.length) {
		proposals.push({
			vendor_id: vendorId,
			source: 'ai_research',
			field_name: 'ai_competitors',
			proposed_value: result.competitors,
			confidence: bases.ai_competitors,
		});
	}

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
			if (r.status === 'fulfilled' && r.value.proposals > 0) {
				succeeded++;
			} else {
				failed++;
			}
		}
	}

	return { total: vendorIds.length, succeeded, failed };
}

/**
 * Auto-enrich all vendors with 'pending' or 'failed' status.
 * Designed for cron/scheduled jobs — uses platform ANTHROPIC_API_KEY only.
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
 */
export async function markStaleForReenrich(
	staleDays = 30,
	limit = 10
): Promise<{ marked: number }> {
	const supabase = createAdminSupabase();
	const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

	const { data: stale, error: sErr } = await supabase
		.from('vendor_library')
		.select('id')
		.eq('enrichment_status', 'enriched')
		.lt('enriched_at', cutoff)
		.order('enriched_at', { ascending: true })
		.limit(limit);

	if (sErr || !stale?.length) {
		return { marked: 0 };
	}

	const ids = stale.map((v) => v.id);
	await supabase
		.from('vendor_library')
		.update({ enrichment_status: 'pending' })
		.in('id', ids);

	return { marked: ids.length };
}
