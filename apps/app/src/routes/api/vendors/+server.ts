import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * Sanitize search string by escaping special PostgREST filter characters
 */
function sanitizeSearch(input: string): string {
	return input.replace(/[\\%_]/g, '\\$&');
}

/**
 * GET /api/vendors — List vendors with filtering, search, and pagination
 */
export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const category = url.searchParams.get('category') ?? '';
	const search = url.searchParams.get('q') ?? '';
	const sort = url.searchParams.get('sort') ?? 'name';
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '24'), 100);
	const offset = parseInt(url.searchParams.get('offset') ?? '0');

	const supabase = createServerSupabase(cookies);

	let query = supabase
		.from('vendor_library')
		.select('id, name, slug, category_id, tagline, description, ai_overview, size, tier, trust_tier, is_verified, avg_rating, pricing_starts_at, free_trial_days, integration_count, enrichment_status, website', { count: 'exact' });

	// Category filter
	if (category) {
		query = query.eq('category_id', category);
	}

	// Search filter (fuzzy match across name, tagline, description)
	if (search) {
		const sanitized = sanitizeSearch(search);
		query = query.or(`name.ilike.%${sanitized}%,tagline.ilike.%${sanitized}%,description.ilike.%${sanitized}%,best_for.ilike.%${sanitized}%`);
	}

	// Sorting
	switch (sort) {
		case 'name':
			query = query.order('name', { ascending: true });
			break;
		case 'category':
			query = query.order('category_id', { ascending: true }).order('name', { ascending: true });
			break;
		case 'tier':
			query = query.order('tier', { ascending: true }).order('name', { ascending: true });
			break;
		case 'enriched':
			query = query.order('enriched_at', { ascending: false, nullsFirst: false });
			break;
		default:
			query = query.order('name', { ascending: true });
	}

	// Pagination
	query = query.range(offset, offset + limit - 1);

	const { data, error: err, count } = await query;

	if (err) {
		error(500, err.message);
	}

	return json({ vendors: data ?? [], total: count ?? 0 });
};
