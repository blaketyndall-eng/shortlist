import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { createServerSupabase } from '$services/supabase.server';

const MODEL = 'claude-haiku-4-5-20251001';

/**
 * POST /api/ai/challenges
 * Generate devil's advocate challenge questions for SOLVE validation step
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { projectId, context } = body;

	if (!context) {
		error(400, 'Context is required');
	}

	const supabase = createServerSupabase(cookies);

	const prompt = `You are a procurement consultant playing devil's advocate. Generate 4 challenge questions for this software decision.

Return ONLY a JSON array of objects with this structure:
[
  {
    "severity": "high|medium|low",
    "icon": "emoji",
    "title": "short title (5-8 words)",
    "question": "the challenge question (1-2 sentences)",
    "context": "1-sentence peer insight or market knowledge"
  }
]

Rules:
- Always include one "high" severity challenge about whether this is really a tooling problem
- Include budget/team-size challenges if relevant
- Include migration challenges if replacing an existing tool
- Include stakeholder alignment as a "low" severity challenge
- Be specific to their context, not generic

Context:
- Problem: ${context.problemDesc || 'Not specified'}
- Approach: ${context.approach || 'buy'}
- Replacing: ${context.existingTool || 'nothing'}
- Category: ${context.category || 'software'}
- Team size: ${context.teamSize || 'unknown'}
- Annual budget: $${context.budgetNum || 'unknown'}
- Vendors in scope: ${context.vendorCount || 0}`;

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
				max_tokens: 600,
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
				engine: 'challenges',
				model: MODEL,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				credits_used: 1,
				latency_ms: latency,
			});
		} catch {
			// Non-critical
		}

		const cleaned = text.replace(/```json|```/g, '').trim();
		const challenges = JSON.parse(cleaned);

		if (!Array.isArray(challenges) || challenges.length === 0) {
			throw new Error('Invalid response format');
		}

		return json({ challenges });
	} catch {
		// Return empty — frontend will use local fallback generation
		return json({ challenges: [] });
	}
};
