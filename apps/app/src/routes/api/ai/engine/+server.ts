import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { createServerSupabase } from '$services/supabase.server';
import type { AIModel, EngineName, EngineDepth, PipelineStage } from '@shortlist/shared-types/ai';

const MODEL_MAP: Record<EngineDepth, string> = {
	quick: 'claude-haiku-4-5-20251001',
	standard: 'claude-sonnet-4-6',
	deep: 'claude-sonnet-4-6'
};

const CREDIT_MAP: Record<string, number> = {
	'claude-haiku-4-5-20251001': 1,
	'claude-sonnet-4-6': 5,
	'claude-opus-4-6': 20
};

interface EngineRequest {
	engine: EngineName;
	depth: EngineDepth;
	context: Record<string, unknown>;
	projectId: string;
}

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	if (!ANTHROPIC_API_KEY) {
		error(500, 'AI service not configured');
	}

	const body: EngineRequest = await request.json();

	if (!body.engine || !body.depth || !body.projectId) {
		error(400, 'Missing required fields: engine, depth, projectId');
	}

	const model = MODEL_MAP[body.depth] ?? MODEL_MAP.standard;
	const startTime = Date.now();

	try {
		// Build the system prompt based on engine type
		const systemPrompt = buildSystemPrompt(body.engine, body.context);
		const userPrompt = buildUserPrompt(body.engine, body.context);

		// Call Anthropic API
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model,
				max_tokens: body.depth === 'quick' ? 1024 : 4096,
				system: systemPrompt,
				messages: [{ role: 'user', content: userPrompt }]
			})
		});

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			error(502, `AI provider error: ${err.error?.message ?? response.statusText}`);
		}

		const aiResult = await response.json();
		const latency = Date.now() - startTime;

		const inputTokens = aiResult.usage?.input_tokens ?? 0;
		const outputTokens = aiResult.usage?.output_tokens ?? 0;
		const credits = CREDIT_MAP[model] ?? 5;

		// Track usage
		const supabase = createServerSupabase(cookies);
		await supabase.from('ai_usage').insert({
			user_id: locals.user.id,
			project_id: body.projectId,
			engine: body.engine,
			model,
			input_tokens: inputTokens,
			output_tokens: outputTokens,
			credits_used: credits,
			latency_ms: latency
		});

		// Parse the AI response
		let parsedResult: unknown;
		try {
			const text = aiResult.content?.[0]?.text ?? '';
			// Try to extract JSON from the response
			const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
			parsedResult = jsonMatch ? JSON.parse(jsonMatch[1] ?? jsonMatch[0]) : { text };
		} catch {
			parsedResult = { text: aiResult.content?.[0]?.text ?? '' };
		}

		return json({
			engine: body.engine,
			stage: 'recommend' as PipelineStage,
			result: parsedResult,
			model: model as AIModel,
			confidence: estimateConfidence(body.depth, aiResult),
			tokensUsed: { input: inputTokens, output: outputTokens }
		});
	} catch (err: any) {
		if (err.status) throw err;
		error(500, `AI engine error: ${err.message}`);
	}
};

function buildSystemPrompt(engine: EngineName, context: Record<string, unknown>): string {
	const base = `You are Shortlist AI, a procurement intelligence assistant. You help teams evaluate vendors and make better purchasing decisions. Always respond with structured, actionable insights.`;

	const enginePrompts: Record<string, string> = {
		evaluate: `${base}\n\nYou specialize in vendor evaluation: scoring, comparison, and analysis. When suggesting criteria, provide a JSON array of objects with name, category (functional/technical/commercial/strategic/risk), weight (1-10), and description.`,
		discovery: `${base}\n\nYou specialize in vendor discovery: identifying, researching, and recommending vendors for specific use cases. Provide structured vendor recommendations with rationale.`,
		rfp: `${base}\n\nYou specialize in RFP generation: creating evaluation questionnaires, requirement documents, and scoring rubrics.`,
		negotiate: `${base}\n\nYou specialize in procurement negotiation: pricing analysis, competitive leverage, and deal strategy.`,
		risk: `${base}\n\nYou specialize in vendor risk assessment: compliance, financial stability, and operational risk analysis.`,
		executive: `${base}\n\nYou specialize in executive communication: creating summaries, dashboards, and decision briefs for leadership.`,
		implement: `${base}\n\nYou specialize in implementation planning: timelines, change management, and vendor onboarding.`,
		vendor: `${base}\n\nYou specialize in vendor intelligence: maintaining and enriching vendor profiles with current market data.`
	};

	return enginePrompts[engine] ?? base;
}

function buildUserPrompt(engine: EngineName, context: Record<string, unknown>): string {
	const task = context.task as string;

	if (task === 'suggest_criteria') {
		const projectName = context.projectName ?? 'this project';
		const category = context.category ?? 'general';
		const existing = (context.existingCriteria as string[]) ?? [];
		const vendors = (context.vendors as string[]) ?? [];

		return `I'm evaluating vendors for: ${projectName} (category: ${category}).

Vendors being considered: ${vendors.join(', ') || 'not yet specified'}

${existing.length > 0 ? `I already have these criteria: ${existing.join(', ')}` : 'I have no criteria yet.'}

Suggest 5-8 additional evaluation criteria. Return a JSON object like:
\`\`\`json
{
  "criteria": [
    { "name": "...", "category": "functional|technical|commercial|strategic|risk", "weight": 1-10, "description": "..." }
  ]
}
\`\`\``;
	}

	// Generic fallback
	return JSON.stringify(context, null, 2);
}

function estimateConfidence(depth: EngineDepth, result: any): number {
	const inputTokens = result.usage?.input_tokens ?? 0;
	const outputTokens = result.usage?.output_tokens ?? 0;

	// Heuristic confidence based on depth and response quality
	let base = depth === 'deep' ? 75 : depth === 'standard' ? 65 : 55;

	// More output generally means more detailed analysis
	if (outputTokens > 1000) base += 10;
	if (outputTokens > 2000) base += 5;

	// Cap at 95 (we never claim 100% confidence)
	return Math.min(base, 95);
}
