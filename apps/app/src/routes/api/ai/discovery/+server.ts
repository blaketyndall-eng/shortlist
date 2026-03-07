import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createServerSupabase } from '$services/supabase.server';

/**
 * POST /api/ai/discovery — AI-powered vendor discovery
 * Searches internal vendor library + generates AI suggestions
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { query, category, projectId } = body;

	if (!query?.trim()) {
		error(400, 'Search query is required');
	}

	const supabase = createServerSupabase(cookies);

	// 1. Search internal vendor library (fuzzy match on name + category)
	const { data: libraryResults } = await supabase
		.from('vendor_library')
		.select('*')
		.or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
		.limit(10);

	// 2. Search org vendor intelligence if user has org context
	let orgResults: any[] = [];
	if (locals.profile) {
		const { data: orgVendors } = await supabase
			.from('org_vendor_intelligence')
			.select('*')
			.or(`vendor_name.ilike.%${query}%,category.ilike.%${query}%`)
			.limit(5);
		orgResults = orgVendors ?? [];
	}

	// 3. AI-powered vendor suggestions
	let aiSuggestions: any[] = [];
	if (env.ANTHROPIC_API_KEY) {
		try {
			const systemPrompt = `You are a B2B procurement intelligence assistant. Suggest vendors for the given category or need. Return a JSON array of vendor objects with: name, description (1 sentence), website, category, strengths (array of 3), and estimatedSize (startup/mid-market/enterprise). Only suggest real, well-known vendors. Return 5-8 suggestions.`;

			const contextParts = [`User is searching for: ${query}`];
			if (category) contextParts.push(`Category: ${category}`);
			if (libraryResults?.length) {
				contextParts.push(`Already found in library: ${libraryResults.map((v) => v.name).join(', ')}`);
			}

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

				// Extract JSON from response
				const jsonMatch = text.match(/\[[\s\S]*\]/);
				if (jsonMatch) {
					aiSuggestions = JSON.parse(jsonMatch[0]);
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
		query
	});
};
