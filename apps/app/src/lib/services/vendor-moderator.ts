import { createAdminSupabase } from '$services/supabase.server';

/**
 * Vendor Moderator Service
 * Processes the enrichment queue with confidence-based auto-apply rules.
 *
 * Thresholds:
 * - ≥0.85: Auto-apply (write directly to vendor_library)
 * - 0.50-0.84: Keep pending for human review
 * - <0.50: Auto-reject
 */

const AUTO_APPLY_THRESHOLD = 0.85;
const REJECT_THRESHOLD = 0.50;

interface QueueItem {
	id: string;
	vendor_id: string;
	source: string;
	field_name: string;
	proposed_value: unknown;
	confidence: number;
	status: string;
}

interface ProcessResult {
	autoApplied: number;
	pendingReview: number;
	rejected: number;
	errors: string[];
}

/**
 * Process all pending items in the enrichment queue
 */
export async function processQueue(): Promise<ProcessResult> {
	const supabase = createAdminSupabase();
	const result: ProcessResult = { autoApplied: 0, pendingReview: 0, rejected: 0, errors: [] };

	// Fetch all pending items
	const { data: items, error: qErr } = await supabase
		.from('vendor_enrichment_queue')
		.select('*')
		.eq('status', 'pending')
		.order('created_at', { ascending: true })
		.limit(500);

	if (qErr || !items) {
		result.errors.push(`Queue fetch failed: ${qErr?.message}`);
		return result;
	}

	// Group by vendor for batch application
	const vendorGroups = new Map<string, QueueItem[]>();
	for (const item of items) {
		const group = vendorGroups.get(item.vendor_id) ?? [];
		group.push(item);
		vendorGroups.set(item.vendor_id, group);
	}

	for (const [vendorId, vendorItems] of vendorGroups) {
		const updateFields: Record<string, unknown> = {};
		const autoAppliedIds: string[] = [];
		const rejectedIds: string[] = [];

		for (const item of vendorItems) {
			if (item.confidence >= AUTO_APPLY_THRESHOLD) {
				// Auto-apply: collect field updates
				let value = item.proposed_value;
				// Parse stringified JSON if needed
				if (typeof value === 'string') {
					try { value = JSON.parse(value); } catch { /* keep as string */ }
				}
				updateFields[item.field_name] = value;
				autoAppliedIds.push(item.id);
				result.autoApplied++;
			} else if (item.confidence < REJECT_THRESHOLD) {
				// Auto-reject
				rejectedIds.push(item.id);
				result.rejected++;
			} else {
				// Keep pending for human review
				result.pendingReview++;
			}
		}

		// Apply high-confidence fields to vendor
		if (Object.keys(updateFields).length > 0) {
			// Also update confidence scores and data sources
			const confidenceScores: Record<string, number> = {};
			const dataSources: Array<{ field: string; source: string; confidence: number; date: string }> = [];

			for (const item of vendorItems.filter((i) => autoAppliedIds.includes(i.id))) {
				confidenceScores[item.field_name] = item.confidence;
				dataSources.push({
					field: item.field_name,
					source: item.source,
					confidence: item.confidence,
					date: new Date().toISOString(),
				});
			}

			const { error: updErr } = await supabase
				.from('vendor_library')
				.update({
					...updateFields,
					confidence_scores: confidenceScores,
					data_sources: dataSources,
					enriched_at: new Date().toISOString(),
					enrichment_status: 'enriched',
				})
				.eq('id', vendorId);

			if (updErr) {
				result.errors.push(`Failed to update vendor ${vendorId}: ${updErr.message}`);
			}
		}

		// Mark auto-applied items
		if (autoAppliedIds.length > 0) {
			await supabase
				.from('vendor_enrichment_queue')
				.update({
					status: 'auto_applied',
					reviewed_at: new Date().toISOString(),
					reason: 'Confidence above auto-apply threshold (≥0.85)',
				})
				.in('id', autoAppliedIds);
		}

		// Mark rejected items
		if (rejectedIds.length > 0) {
			await supabase
				.from('vendor_enrichment_queue')
				.update({
					status: 'rejected',
					reviewed_at: new Date().toISOString(),
					reason: 'Confidence below reject threshold (<0.50)',
				})
				.in('id', rejectedIds);
		}

		// Check if vendor has no more pending items — if all applied, mark as enriched
		const stillPending = vendorItems.filter(
			(i) => !autoAppliedIds.includes(i.id) && !rejectedIds.includes(i.id)
		);
		if (stillPending.length === 0 && autoAppliedIds.length > 0) {
			await supabase
				.from('vendor_library')
				.update({ enrichment_status: 'enriched' })
				.eq('id', vendorId);
		}
	}

	return result;
}

/**
 * Manually review a queue item (approve or reject)
 */
export async function reviewItem(
	queueItemId: string,
	approved: boolean,
	reviewedBy: string,
	reason?: string
): Promise<{ success: boolean; error?: string }> {
	const supabase = createAdminSupabase();

	// Fetch the queue item
	const { data: item, error: fetchErr } = await supabase
		.from('vendor_enrichment_queue')
		.select('*')
		.eq('id', queueItemId)
		.single();

	if (fetchErr || !item) {
		return { success: false, error: `Item not found: ${queueItemId}` };
	}

	if (approved) {
		// Apply the value to vendor_library
		let value = item.proposed_value;
		if (typeof value === 'string') {
			try { value = JSON.parse(value); } catch { /* keep as string */ }
		}

		const { error: updErr } = await supabase
			.from('vendor_library')
			.update({
				[item.field_name]: value,
				enriched_at: new Date().toISOString(),
			})
			.eq('id', item.vendor_id);

		if (updErr) {
			return { success: false, error: `Failed to apply: ${updErr.message}` };
		}
	}

	// Update queue item status
	await supabase
		.from('vendor_enrichment_queue')
		.update({
			status: approved ? 'approved' : 'rejected',
			reviewed_by: reviewedBy,
			reviewed_at: new Date().toISOString(),
			reason: reason ?? (approved ? 'Manually approved' : 'Manually rejected'),
		})
		.eq('id', queueItemId);

	return { success: true };
}
