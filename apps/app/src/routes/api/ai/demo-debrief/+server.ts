import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createServerSupabase } from '$services/supabase.server';

const MODEL = 'claude-haiku-4-5-20251001';

/**
 * POST /api/ai/demo-debrief
 * Synthesize post-demo feedback from all attendees into a debrief
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { sessionId, projectId, vendorName, feedback } = body;

	if (!sessionId || !feedback) {
		error(400, 'Session ID and feedback are required');
	}

	const supabase = createServerSupabase(cookies);

	// Compile feedback from all attendees
	const feedbackEntries = Object.entries(feedback);
	const feedbackSummary = feedbackEntries
		.map(([userId, fb]: [string, any]) => {
			return `Evaluator (score: ${fb.overallScore}/10):
Notes: ${fb.notes || 'None'}
Criteria scores: ${JSON.stringify(fb.criteriaScores ?? {})}`;
		})
		.join('\n\n');

	const prompt = `You are a B2B purchase intelligence analyst synthesizing post-demo feedback from ${feedbackEntries.length} team member(s) who evaluated "${vendorName}".

Feedback submissions:
${feedbackSummary}

Analyze the feedback and return ONLY a JSON object with this structure:
{
  "agreedPositives": ["things all/most evaluators agreed were positive"],
  "agreedConcerns": ["concerns shared by multiple evaluators"],
  "keyDisagreement": "the most significant point where evaluators disagreed, or null if aligned",
  "recommendedFollowUp": "one specific follow-up action to take next",
  "overallSentiment": "positive" | "mixed" | "negative",
  "avgScore": number
}

Focus on identifying consensus and divergence. Be specific and actionable.`;

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
				engine: 'demo_debrief',
				model: MODEL,
				input_tokens: inputTokens,
				output_tokens: outputTokens,
				credits_used: 2,
				latency_ms: latency,
			});
		} catch {
			// Non-critical
		}

		// Parse result
		const cleaned = text.replace(/```json|```/g, '').trim();
		const debrief = JSON.parse(cleaned);

		// Save debrief to the demo session
		const { data: project } = await supabase
			.from('projects')
			.select('solve_data')
			.eq('id', projectId)
			.single();

		if (project) {
			const currentSolveData = project.solve_data ?? {};
			const sessions = [...(currentSolveData.demoSessions ?? [])];
			const session = sessions.find((s: any) => s.id === sessionId);
			if (session) {
				session.aiDebrief = debrief;
				await supabase
					.from('projects')
					.update({
						solve_data: { ...currentSolveData, demoSessions: sessions },
						updated_at: new Date().toISOString(),
					})
					.eq('id', projectId);
			}
		}

		return json({ debrief });
	} catch (err: any) {
		// Return minimal debrief on error
		const scores = feedbackEntries.map(([_, fb]: [string, any]) => fb.overallScore ?? 0);
		const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

		return json({
			debrief: {
				agreedPositives: [],
				agreedConcerns: [],
				keyDisagreement: null,
				recommendedFollowUp: 'Review individual feedback and discuss as a team.',
				overallSentiment: avgScore >= 7 ? 'positive' : avgScore >= 4 ? 'mixed' : 'negative',
				avgScore,
			},
		});
	}
};
