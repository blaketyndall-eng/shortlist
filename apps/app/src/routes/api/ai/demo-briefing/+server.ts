import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { createServerSupabase } from '$services/supabase.server';

const MODEL = 'claude-haiku-4-5-20251001';

/**
 * POST /api/ai/demo-briefing
 * Generate AI-powered demo questions for a vendor
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { vendorName, projectId, criteria, problemDescription, vendorProfile } = body;

	if (!vendorName) {
		error(400, 'Vendor name is required');
	}

	const supabase = createServerSupabase(cookies);

	const prompt = `You are a B2B procurement expert helping prepare for a vendor demo.

Generate 6 targeted demo questions for evaluating "${vendorName}".

Context:
- Problem: ${problemDescription || 'General software evaluation'}
- Evaluation criteria: ${(criteria ?? []).join(', ') || 'Not specified'}
${vendorProfile?.overview ? `- Vendor overview: ${vendorProfile.overview}` : ''}
${vendorProfile?.concerns?.length ? `- Known concerns: ${vendorProfile.concerns.join(', ')}` : ''}
${vendorProfile?.strengths?.length ? `- Known strengths: ${vendorProfile.strengths.join(', ')}` : ''}

Return ONLY a JSON array of objects with this structure:
[
  {
    "text": "The question to ask during the demo",
    "crit": "Which evaluation criterion this relates to",
    "why": "Brief explanation of why this question matters"
  }
]

Make questions specific to the vendor, not generic. Focus on:
- Validating claimed strengths
- Probing known concerns
- Testing against evaluation criteria
- Uncovering hidden limitations
- Understanding implementation reality`;

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
				max_tokens: 1200,
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
				engine: 'demo_briefing',
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
		const questions = JSON.parse(cleaned);

		return json({ questions });
	} catch (err: any) {
		// Return fallback questions
		return json({
			questions: (criteria ?? []).slice(0, 3).map((crit: string) => ({
				text: `Can you demonstrate how ${vendorName} specifically addresses ${crit}?`,
				crit,
				why: `Core evaluation criterion that needs validation during the demo.`,
			})),
		});
	}
};
