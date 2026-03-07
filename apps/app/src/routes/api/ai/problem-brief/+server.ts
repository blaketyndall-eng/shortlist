import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createServerSupabase } from '$services/supabase.server';

const MODEL = 'claude-sonnet-4-6';

/**
 * POST /api/ai/problem-brief
 * Generate an AI-powered problem brief from SOLVE data
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

	const prompt = `You are a senior purchase intelligence consultant writing a problem brief for a B2B software evaluation.

Based on the following inputs, generate a structured problem brief. Return ONLY a JSON object:
{
  "execSummary": "2-3 sentence executive summary of the evaluation",
  "problem": "Clear, refined problem statement (1-2 paragraphs)",
  "successCriteria": "What success looks like in 90 days",
  "peerBenchmark": "1-2 sentences about how similar companies approach this category"
}

Context:
- Problem: ${context.problemDesc || 'Not specified'}
- Who's affected: ${context.whoAffected || 'Not specified'}
- Cost of inaction: ${context.costOfNothing || 'Not specified'}
- 90-day success: ${context.successIn90 || 'Not specified'}
- Category: ${context.category || 'General software'}
- Approach: ${context.approach || 'buy'}
- Current tool: ${context.existingTool || 'None'}
- Team size: ${context.teamSize || 'Unknown'}
- Budget: ${context.budget || 'Unknown'}
- Vendors in scope: ${context.vendorCount || 0}
- Must-have requirements: ${(context.mustHaves || []).join(', ') || 'None specified'}
- Hard constraints: ${(context.constraints || []).join(', ') || 'None specified'}

Write professionally and concisely. Be specific, not generic.`;

	try {
		const startTime = Date.now();
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': env.ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: MODEL,
				max_tokens: 800,
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
				engine: 'problem_brief',
				model: MODEL,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				credits_used: 5,
				latency_ms: latency,
			});
		} catch {
			// Non-critical
		}

		const cleaned = text.replace(/```json|```/g, '').trim();
		const result = JSON.parse(cleaned);
		return json(result);
	} catch (err: any) {
		// Return empty on failure — frontend will use local fallback
		return json({
			execSummary: '',
			problem: context.problemDesc || '',
			successCriteria: context.successIn90 || '',
			peerBenchmark: '',
		}, { status: 200 });
	}
};
