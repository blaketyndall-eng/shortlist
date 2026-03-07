import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';
import { getSmartDefaults } from '$services/smart-defaults';

/**
 * POST /api/projects/smart-defaults
 * Get smart defaults based on category + past projects.
 * Optionally enriches with AI for recommendations.
 */
export const POST: RequestHandler = async ({ request, locals, cookies, fetch: serverFetch }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { category, useAI } = body;

	const supabase = createServerSupabase(cookies);

	// Load company profile for buyer context
	let companyProfile: Record<string, unknown> | null = null;
	try {
		const { data: profileRow } = await supabase
			.from('profiles')
			.select('company_profile')
			.eq('id', locals.user.id)
			.single();
		companyProfile = profileRow?.company_profile ?? null;
	} catch {
		// Non-critical
	}

	// Get pattern-based defaults
	const defaults = await getSmartDefaults(category, companyProfile, supabase);

	// Optionally enrich with AI
	let aiDefaults = null;
	if (useAI && defaults.hasPastData) {
		try {
			const pastSummary = [
				`Past projects: ${defaults.pastProjectCount}`,
				`Top criteria: ${defaults.criteria.map((c) => `${c.name} (${c.frequency}x)`).join(', ')}`,
				`Common constraints: ${defaults.constraints.map((c) => c.description).join('; ')}`,
				`Frequent vendors: ${defaults.frequentVendors.map((v) => `${v.name} (${v.count}x)`).join(', ')}`,
			].join('\n');

			const buyerSummary = companyProfile
				? [
						companyProfile.name ? `Company: ${companyProfile.name}` : '',
						companyProfile.industry ? `Industry: ${companyProfile.industry}` : '',
						companyProfile.size ? `Size: ${companyProfile.size}` : '',
						companyProfile.budget ? `Budget: ${companyProfile.budget}` : '',
					]
						.filter(Boolean)
						.join(', ')
				: 'No company profile available';

			const aiResponse = await serverFetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'smart_defaults',
					projectId: 'smart-defaults',
					depth: 'quick',
					context: {
						category,
						pastProjectSummary: pastSummary,
						buyerSummary,
					},
				}),
			});

			if (aiResponse.ok) {
				const result = await aiResponse.json();
				aiDefaults = result.data ?? result.result ?? null;
			}
		} catch {
			// Non-critical — return pattern-based defaults only
		}
	}

	return json({
		defaults,
		aiDefaults,
	});
};
