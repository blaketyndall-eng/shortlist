import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAdminSupabase } from '$services/supabase.server';
import { vendorSeeds } from '$lib/data/vendor-seeds';

/**
 * POST /api/vendors/seed — Seed vendor library with initial data
 * Admin-only endpoint (uses service role client)
 */
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createAdminSupabase();

	// 1. Fetch category IDs for slug mapping
	const { data: categories, error: catErr } = await supabase
		.from('vendor_categories')
		.select('id, slug');

	if (catErr) {
		error(500, `Failed to fetch categories: ${catErr.message}`);
	}

	const catMap = new Map((categories ?? []).map((c) => [c.slug, c.id]));

	// 2. Upsert vendors
	let inserted = 0;
	let updated = 0;
	const errors: string[] = [];

	for (const seed of vendorSeeds) {
		const categoryUuid = catMap.get(seed.category_id);

		const vendorRow = {
			name: seed.name,
			slug: seed.slug,
			category_id: seed.category_id, // Keep as slug for text column
			website: seed.website,
			founded: seed.founded,
			hq_location: seed.hq_location,
			employee_range: seed.employee_range,
			funding_stage: seed.funding_stage,
			tagline: seed.tagline,
			description: seed.description,
			best_for: seed.best_for,
			tier: seed.tier,
			size: seed.size,
			features: seed.features,
			compliance_certs: seed.compliance_certs,
			pricing_starts_at: seed.pricing_starts_at,
			free_trial_days: seed.free_trial_days,
			integration_count: seed.integration_count,
			trust_tier: seed.trust_tier,
			enrichment_status: 'pending',
			updated_at: new Date().toISOString(),
		};

		// Upsert by slug
		const { data: existing } = await supabase
			.from('vendor_library')
			.select('id')
			.eq('slug', seed.slug)
			.maybeSingle();

		if (existing) {
			const { error: upErr } = await supabase
				.from('vendor_library')
				.update(vendorRow)
				.eq('id', existing.id);
			if (upErr) {
				errors.push(`Update ${seed.name}: ${upErr.message}`);
			} else {
				updated++;
			}
		} else {
			const { error: insErr } = await supabase
				.from('vendor_library')
				.insert(vendorRow);
			if (insErr) {
				errors.push(`Insert ${seed.name}: ${insErr.message}`);
			} else {
				inserted++;
			}
		}
	}

	// 3. Update category vendor counts
	for (const [slug] of catMap) {
		const { count } = await supabase
			.from('vendor_library')
			.select('*', { count: 'exact', head: true })
			.eq('category_id', slug);

		await supabase
			.from('vendor_categories')
			.update({ vendor_count: count ?? 0 })
			.eq('slug', slug);
	}

	return json({
		success: true,
		total: vendorSeeds.length,
		inserted,
		updated,
		errors: errors.length > 0 ? errors : undefined,
	});
};
