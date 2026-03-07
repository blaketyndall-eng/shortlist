import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { autoEnrichPending, markStaleForReenrich } from '$lib/services/vendor-hunter';
import { processQueue } from '$lib/services/vendor-moderator';

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

		const duration = Date.now() - startTime;
		log.push(`Completed in ${duration}ms`);

		return json({
			success: true,
			duration,
			stale: staleResult,
			enrichment: enrichResult,
			moderation: moderatorResult,
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
