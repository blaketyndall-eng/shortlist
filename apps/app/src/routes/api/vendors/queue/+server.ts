import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { reviewItem } from '$lib/services/vendor-moderator';

/**
 * GET /api/vendors/queue — List pending enrichment items
 */
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const status = url.searchParams.get('status') ?? 'pending';
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') ?? '0');

	const supabase = createServerSupabase(cookies);

	const { data, error: qErr, count } = await supabase
		.from('vendor_enrichment_queue')
		.select('*, vendor_library(id, name, slug, category_id)', { count: 'exact' })
		.eq('status', status)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (qErr) {
		error(500, qErr.message);
	}

	return json({ items: data ?? [], total: count ?? 0, offset, limit });
};

/**
 * PATCH /api/vendors/queue — Review (approve/reject) a queue item
 * Body: { itemId: string, approved: boolean, reason?: string }
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { itemId, approved, reason } = body;

	if (!itemId || typeof approved !== 'boolean') {
		error(400, 'Provide itemId and approved (boolean)');
	}

	const result = await reviewItem(itemId, approved, locals.user.id, reason);

	if (!result.success) {
		error(500, result.error ?? 'Review failed');
	}

	return json({ success: true });
};
