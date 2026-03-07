import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { autoEnrichPending, markStaleForReenrich } from '$lib/services/vendor-hunter';
import { processQueue } from '$lib/services/vendor-moderator';
import { createAdminSupabase } from '$services/supabase.server';

/**
 * GET /api/vendors/cron-enrich — Scheduled vendor enrichment
 *
 * Platform-managed, automatic enrichment pipeline.
 * Secured by CRON_SECRET (Vercel Cron sends this as Authorization header).
 * No user auth, no user API keys — Shortlist owns this process entirely.
 *
 * Flow:
 * 1. Mark stale vendors (enriched >30 days ago) for re-enrichment
 * 2. Enrich pending/failed vendors (batch of 20)
 * 3. Run moderator to auto-apply high-confidence results
 * 4. Detect vendor changes and create alerts for active projects
 *
 * Designed to be called on a schedule (e.g., every 6 hours via Vercel Cron).
 */
export const GET = async ({ request }: RequestEvent) => {
	// Verify cron secret — Vercel sends it as Authorization: Bearer <secret>
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.replace('Bearer ', '');

	const CRON_SECRET = env.CRON_SECRET;
	if (!CRON_SECRET || token !== CRON_SECRET) {
		error(401, 'Unauthorized — invalid cron secret');
	}

	const startTime = Date.now();
	const log: string[] = [];

	try {
		// Step 1: Mark stale vendors for re-enrichment (>30 days old)
		const staleResult = await markStaleForReenrich(30, 10);
		log.push(`Marked ${staleResult.marked} stale vendors for re-enrichment`);

		// Step 2: Enrich pending vendors (20 per run, 3 concurrent)
		const enrichResult = await autoEnrichPending(20);
		log.push(
			`Enriched ${enrichResult.succeeded}/${enrichResult.total} vendors ` +
			`(${enrichResult.failed} failed)`
		);

		// Step 3: Run moderator — auto-apply high confidence, reject low
		const moderatorResult = await processQueue();
		log.push(
			`Moderator: ${moderatorResult.autoApplied} auto-applied, ` +
			`${moderatorResult.pendingReview} pending review, ` +
			`${moderatorResult.rejected} rejected`
		);

		// Step 4: Detect vendor changes and alert active projects
		let changeAlerts = 0;
		try {
			changeAlerts = await detectVendorChanges();
			log.push(`Vendor change alerts created: ${changeAlerts}`);
		} catch (changeErr: any) {
			log.push(`Change detection skipped: ${changeErr.message}`);
		}

		const duration = Date.now() - startTime;
		log.push(`Completed in ${duration}ms`);

		return json({
			success: true,
			duration,
			stale: staleResult,
			enrichment: enrichResult,
			moderation: moderatorResult,
			changeAlerts,
			log,
		});
	} catch (err: any) {
		log.push(`Error: ${err.message}`);
		return json({
			success: false,
			error: err.message,
			log,
			duration: Date.now() - startTime,
		}, { status: 500 });
	}
};

/**
 * Detect material changes between enrichment cycles.
 * Compares current vendor data with previous_enrichment snapshot.
 * Creates activity_log alerts for active projects evaluating changed vendors.
 */
async function detectVendorChanges(): Promise<number> {
	const supabase = createAdminSupabase();
	let alertCount = 0;

	// Find vendors with previous_enrichment data that were recently re-enriched
	const { data: vendors } = await supabase
		.from('vendor_library')
		.select('id, name, ai_pricing, ai_overview, ai_strengths, ai_concerns, previous_enrichment')
		.not('previous_enrichment', 'is', null)
		.order('enriched_at', { ascending: false })
		.limit(50);

	if (!vendors || vendors.length === 0) return 0;

	for (const vendor of vendors) {
		const prev = vendor.previous_enrichment as Record<string, unknown>;
		if (!prev) continue;

		// Check for material changes in key fields
		const changes: Array<{ field: string; before: string; after: string }> = [];

		if (prev.ai_pricing && vendor.ai_pricing && prev.ai_pricing !== vendor.ai_pricing) {
			changes.push({ field: 'pricing', before: String(prev.ai_pricing).slice(0, 100), after: String(vendor.ai_pricing).slice(0, 100) });
		}
		if (prev.ai_overview && vendor.ai_overview && prev.ai_overview !== vendor.ai_overview) {
			// Only flag if meaningfully different (>20% change in length or content)
			const prevLen = String(prev.ai_overview).length;
			const currLen = String(vendor.ai_overview).length;
			if (Math.abs(prevLen - currLen) / Math.max(prevLen, 1) > 0.2) {
				changes.push({ field: 'overview', before: 'changed', after: 'updated' });
			}
		}

		const prevConcerns = Array.isArray(prev.ai_concerns) ? prev.ai_concerns : [];
		const currConcerns = Array.isArray(vendor.ai_concerns) ? vendor.ai_concerns : [];
		if (currConcerns.length > prevConcerns.length) {
			changes.push({
				field: 'concerns',
				before: `${prevConcerns.length} concerns`,
				after: `${currConcerns.length} concerns`,
			});
		}

		if (changes.length === 0) continue;

		// Find active projects evaluating this vendor
		const { data: projects } = await supabase
			.from('projects')
			.select('id, name, state')
			.eq('status', 'active')
			.not('state', 'is', null);

		if (!projects) continue;

		for (const project of projects) {
			const state = (project.state ?? {}) as Record<string, unknown>;
			const projectVendors = Array.isArray(state.vendors) ? state.vendors : [];
			const isEvaluating = projectVendors.some(
				(v: any) => v.name === vendor.name || v.vendorProfileId === vendor.id
			);

			if (isEvaluating) {
				// Create activity log alert
				try {
					await supabase.from('activity_log').insert({
						project_id: project.id,
						user_id: '00000000-0000-0000-0000-000000000000', // system user
						verb: 'vendor_changed',
						detail: `${vendor.name}: ${changes.map((c) => c.field).join(', ')} changed since evaluation started`,
						metadata: { vendorId: vendor.id, vendorName: vendor.name, changes },
					});
					alertCount++;
				} catch {
					// Ignore individual insert failures
				}
			}
		}

		// Clear previous_enrichment after processing
		await supabase
			.from('vendor_library')
			.update({ previous_enrichment: null })
			.eq('id', vendor.id);
	}

	return alertCount;
}
