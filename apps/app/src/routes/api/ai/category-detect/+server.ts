import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { createServerSupabase } from '$services/supabase.server';

const MODEL = 'claude-haiku-4-5-20251001';

interface CategoryResult {
	category: string;
	label: string;
	confidence: number;
	alternatives: { category: string; label: string; confidence: number }[];
}

/**
 * POST /api/ai/category-detect
 * Detect software category from problem description and triggers
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { problemDescription, triggers, existingTool, projectId } = body;

	if (!problemDescription?.trim()) {
		error(400, 'Problem description is required');
	}

	const supabase = createServerSupabase(cookies);

	const prompt = `You are a B2B software procurement expert. Based on the user's problem description and context, detect what category of software they need.

Return ONLY a JSON object with this structure:
{
  "category": "short_id",
  "label": "Human-readable label",
  "confidence": 0.0-1.0,
  "alternatives": [
    { "category": "short_id", "label": "Label", "confidence": 0.0-1.0 }
  ]
}

Common categories: crm, hr, pm, collab, analytics, security, finance, marketing, sales, support, erp, dev_tools, communication, storage, design

Problem description: ${problemDescription}
${triggers?.length ? `Triggers: ${triggers.join(', ')}` : ''}
${existingTool ? `Currently using: ${existingTool}` : ''}`;

	try {
		const startTime = Date.now();
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: MODEL,
				max_tokens: 400,
				messages: [{ role: 'user', content: prompt }],
			}),
		});

		if (!response.ok) {
			throw new Error(`Anthropic API error: ${response.status}`);
		}

		const data = await response.json();
		const text = data.content?.[0]?.text ?? '';
		const latency = Date.now() - startTime;
		const inputTokens = data.usage?.input_tokens ?? 0;
		const outputTokens = data.usage?.output_tokens ?? 0;

		// Log usage
		try {
			await supabase.from('ai_usage').insert({
				user_id: locals.user.id,
				project_id: projectId,
				engine: 'category_detect',
				model: MODEL,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				credits_used: 1,
				latency_ms: latency,
			});
		} catch {
			// Non-critical
		}

		// Parse result
		const cleaned = text.replace(/```json|```/g, '').trim();
		const result: CategoryResult = JSON.parse(cleaned);

		return json(result);
	} catch (err: any) {
		// Return fallback on any error
		return json({
			category: 'general',
			label: 'General Business Software',
			confidence: 0.3,
			alternatives: [
				{ category: 'pm', label: 'Project Management', confidence: 0.2 },
				{ category: 'collab', label: 'Collaboration', confidence: 0.15 },
			],
		});
	}
};
