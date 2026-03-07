import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createServerSupabase } from '$services/supabase.server';

/**
 * Sanitize search string by escaping special PostgREST filter characters
 */
function sanitizeSearch(input: string): string {
	return input.replace(/[\\%_]/g, '\\$&');
}

/**
 * POST /api/ai/discovery — AI-powered vendor discovery
 * Searches internal vendor library + generates AI suggestions
 *
 * v2: Fixed column references, improved AI suggestion quality,
 * added category-aware search, better result ranking
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { query, category, projectId, limit = 10, offset = 0 } = body;

	if (!query?.trim()) {
		error(400, 'Search query is required');
	}

	const supabase = createServerSupabase(cookies);

	// 1. Search internal vendor library (fuzzy match on name, tagline, description, ai_overview)
	const sanitized = sanitizeSearch(query);
	let libraryQuery = supabase
		.from('vendor_library')
		.select('*')
		.or(`name.ilike.%${sanitized}%,tagline.ilike.%${sanitized}%,description.ilike.%${sanitized}%,ai_overview.ilike.%${sanitized}%,best_for.ilike.%${sanitized}%`)
		.range(offset, offset + limit - 1);

	// Add category filter if provided
	if (category) {
		libraryQuery = libraryQuery.eq('category_id', category);
	}

	const { data: libraryResults } = await libraryQuery;

	// 2. Search org vendor intelligence if user has org context
	// Note: org_vendor_intelligence table may not exist yet — query is wrapped in try/catch
	let orgResults: any[] = [];
	if (locals.profile) {
		try {
			const { data: orgVendors } = await supabase
				.from('org_vendor_intelligence')
				.select('*')
				.or(`vendor_name.ilike.%${sanitized}%,category.ilike.%${sanitized}%`)
				.limit(5);
			orgResults = orgVendors ?? [];
		} catch {
			// Table may not exist yet — skip org intelligence
		}
	}

	// 3. AI-powered vendor suggestions (when library results are sparse)
	let aiSuggestions: any[] = [];
	if (env.ANTHROPIC_API_KEY && (!libraryResults || libraryResults.length < 3)) {
		try {
			const systemPrompt = `You are a B2B purchase intelligence assistant with deep market knowledge. Suggest vendors that match the buyer's search query.

CRITICAL: Only suggest real, established vendors. Include specific details like pricing ranges and employee counts. Return ONLY a JSON array, no markdown.`;

			const contextParts = [`Buyer is searching for: ${query}`];
			if (category) contextParts.push(`Category filter: ${category}`);
			if (libraryResults?.length) {
				contextParts.push(`Already found in our library: ${libraryResults.map((v: any) => v.name).join(', ')}`);
				contextParts.push('Suggest DIFFERENT vendors not already in the results above.');
			}

			contextParts.push(`\nReturn a JSON array of 5-8 vendor objects:
[{
  "name": "Vendor Name",
  "description": "One sentence describing what they do and who they serve",
  "website": "vendor.com",
  "category": "category name",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "estimatedSize": "startup|mid-market|enterprise",
  "typicalPricing": "pricing range (e.g. '$25-65/user/month')",
  "bestFor": "ideal customer profile in one sentence"
}]

Rank by relevance to the search query. Be specific — no generic descriptions.`);

			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.ANTHROPIC_API_KEY,
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-haiku-4-5-20251001',
					max_tokens: 2048,
					system: systemPrompt,
					messages: [{ role: 'user', content: contextParts.join('\n') }]
				})
			});

			if (response.ok) {
				const data = await response.json();
				const text = data.content?.[0]?.text ?? '';

				// Extract JSON array from response
				const jsonMatch = text.match(/\[[\s\S]*\]/);
				if (jsonMatch) {
					try {
						aiSuggestions = JSON.parse(jsonMatch[0]);
					} catch {
						// Parse failed — skip AI suggestions
					}
				}

				// Log AI usage
				await supabase.from('ai_usage').insert({
					user_id: locals.user.id,
					project_id: projectId || null,
					engine: 'discovery',
					model: 'claude-haiku-4-5-20251001',
					input_tokens: data.usage?.input_tokens ?? 0,
					output_tokens: data.usage?.output_tokens ?? 0,
					credits_used: 1
				});
			}
		} catch {
			// AI suggestions are optional — continue without them
		}
	}

	return json({
		library: libraryResults ?? [],
		orgIntelligence: orgResults,
		aiSuggestions,
		query,
		total: libraryResults?.length ?? 0,
	});
};
