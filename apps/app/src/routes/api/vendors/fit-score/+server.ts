import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { rankVendorsByFit } from '$lib/services/vendor-fit-scorer';

/**
 * POST /api/vendors/fit-score
 * Calculate AI fit scores for vendors against buyer profile + project context.
 *
 * Body: {
 *   projectId?: string,        // Optional — auto-loads project context
 *   category?: string,         // Filter to specific category slug
 *   vendorIds?: string[],      // Score specific vendors (default: all in category)
 *   limit?: number,            // Max results (default: 20)
 *   buyerProfile?: object,     // Override buyer profile
 *   projectContext?: object,    // Override project context
 * }
 *
 * Returns ranked vendors with fit scores and breakdown.
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	// 1. Load buyer profile from company_profiles
	let buyerProfile = body.buyerProfile ?? {};
	if (!body.buyerProfile && locals.profile?.org_id) {
		const { data: orgProfile } = await supabase
			.from('company_profiles')
			.select('*')
			.eq('org_id', locals.profile.org_id)
			.single();

		if (orgProfile) {
			buyerProfile = {
				industry: orgProfile.industry,
				size: orgProfile.size,
				budget: orgProfile.budget,
				compliance: orgProfile.compliance,
				priorities: orgProfile.priorities,
				stack: orgProfile.stack,
				vendorPref: orgProfile.vendor_pref,
				regions: orgProfile.regions,
			};
		}
	}

	// 2. Load project context
	let projectContext = body.projectContext ?? {};
	if (!body.projectContext && body.projectId) {
		const { data: project } = await supabase
			.from('projects')
			.select('name, state')
			.eq('id', body.projectId)
			.single();

		if (project?.state) {
			const s = project.state as Record<string, unknown>;
			projectContext = {
				problem: s.problem,
				category: s.category,
				teamSize: s.teamSize,
				budget: s.budget ?? buyerProfile.budget,
				existingTool: s.existingTool,
				approach: s.approach,
			};
		}
	}

	// 3. Load vendors to score
	let vendorQuery = supabase
		.from('vendor_library')
		.select('*');

	if (body.vendorIds?.length) {
		vendorQuery = vendorQuery.in('id', body.vendorIds);
	} else if (body.category) {
		vendorQuery = vendorQuery.eq('category_id', body.category);
	}

	vendorQuery = vendorQuery.limit(body.limit ?? 100);

	const { data: vendors, error: vErr } = await vendorQuery;

	if (vErr || !vendors) {
		error(500, `Failed to load vendors: ${vErr?.message}`);
	}

	// 4. Score and rank
	const ranked = rankVendorsByFit(vendors, buyerProfile, projectContext);

	// 5. Return top N with vendor data attached
	const limit = body.limit ?? 20;
	const topScored = ranked.slice(0, limit).map((score) => {
		const vendor = vendors.find((v) => v.id === score.vendorId);
		return {
			...score,
			vendor: vendor ? {
				id: vendor.id,
				name: vendor.name,
				slug: vendor.slug,
				website: vendor.website,
				tagline: vendor.tagline,
				category_id: vendor.category_id,
				tier: vendor.tier,
				size: vendor.size,
				employee_range: vendor.employee_range,
				ai_overview: vendor.ai_overview,
				ai_pricing: vendor.ai_pricing,
				features: vendor.features,
				enrichment_status: vendor.enrichment_status,
				logo_url: vendor.logo_url,
				best_for: vendor.best_for,
				free_trial_days: vendor.free_trial_days,
			} : null,
		};
	});

	return json({
		scores: topScored,
		total: ranked.length,
		buyerProfile,
		projectContext,
	});
};
