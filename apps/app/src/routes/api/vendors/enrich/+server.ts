import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enrichVendor, enrichBatch } from '$lib/services/vendor-hunter';
import { processQueue } from '$lib/services/vendor-moderator';

/**
 * POST /api/vendors/enrich — Trigger enrichment for vendor(s)
 * Body: { vendorId?: string, vendorIds?: string[], runModerator?: boolean }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { vendorId, vendorIds, runModerator = true } = body;

	if (!vendorId && !vendorIds?.length) {
		error(400, 'Provide vendorId or vendorIds');
	}

	let result;

	if (vendorId) {
		// Single vendor enrichment
		result = await enrichVendor(vendorId);
	} else {
		// Batch enrichment
		result = await enrichBatch(vendorIds, 3);
	}

	// Run moderator to process the queue
	let moderatorResult;
	if (runModerator) {
		moderatorResult = await processQueue();
	}

	return json({
		enrichment: result,
		moderation: moderatorResult ?? null,
	});
};
