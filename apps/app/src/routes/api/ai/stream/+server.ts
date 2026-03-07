import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

/**
 * Streaming AI endpoint — returns Server-Sent Events.
 * Used for chat-like interactions where progressive display is needed.
 *
 * Enhanced v2: Context-aware system prompt that adapts to the user's
 * current workflow stage (setup, evaluation, negotiation, etc.)
 */

interface StreamRequest {
	context: string | Record<string, unknown>;
	depth?: 'quick' | 'standard' | 'deep';
	/** Optional: current workflow stage for context-aware prompting */
	stage?: 'setup' | 'solve' | 'evaluate' | 'negotiate' | 'decide' | 'general';
	/** Optional: project context for tailored responses */
	projectContext?: {
		name?: string;
		category?: string;
		vendors?: string[];
		problem?: string;
		budget?: string;
		teamSize?: string;
	};
	/** Optional: company profile for buyer-aware responses */
	companyProfile?: Record<string, unknown>;
}

const STAGE_PROMPTS: Record<string, string> = {
	setup: `You are Shortlist AI, helping a procurement team set up their vendor evaluation. Focus on:
- Defining clear evaluation criteria and weights
- Identifying the right vendor shortlist for their needs
- Ensuring compliance requirements are captured
- Suggesting team roles and evaluation timeline
Be proactive about what they might be missing in their setup.`,

	solve: `You are Shortlist AI, helping identify the right software solution. Focus on:
- Understanding the core problem and business impact
- Recommending vendor categories and specific vendors
- Surfacing risks and considerations early
- Challenging assumptions with devil's advocate questions
Be direct about market realities and avoid vendor hype.`,

	evaluate: `You are Shortlist AI, guiding vendor evaluation and scoring. Focus on:
- Fair, evidence-based vendor comparison
- Identifying score anomalies and bias
- Surfacing hidden costs and implementation risks
- Preparing for vendor demos with targeted questions
Push for specificity and evidence over gut feelings.`,

	negotiate: `You are Shortlist AI, coaching on vendor negotiation. Focus on:
- Contract terms and commercial strategy
- Hidden cost identification and mitigation
- Leverage points based on market intelligence
- Walk-away criteria and BATNA
Be assertive about protecting the buyer's interests.`,

	decide: `You are Shortlist AI, helping finalize a vendor decision. Focus on:
- Decision readiness assessment
- Executive brief preparation
- Risk register and mitigation plans
- Implementation planning and change management
Be thorough about risk without creating analysis paralysis.`,

	general: `You are Shortlist AI, a procurement intelligence assistant. You help B2B buyers evaluate, compare, and select software vendors with confidence. Be concise, actionable, and specific. Back up claims with market intelligence when possible.`,
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	if (!env.ANTHROPIC_API_KEY) {
		error(500, 'AI service not configured');
	}

	const body: StreamRequest = await request.json();
	const model = body.depth === 'quick' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';
	const stage = body.stage ?? 'general';

	// Build context-aware system prompt
	let systemPrompt = STAGE_PROMPTS[stage] ?? STAGE_PROMPTS.general;

	// Inject project context if available
	if (body.projectContext) {
		const pc = body.projectContext;
		const contextParts: string[] = ['\n\n=== CURRENT PROJECT ==='];
		if (pc.name) contextParts.push(`Project: ${pc.name}`);
		if (pc.category) contextParts.push(`Category: ${pc.category}`);
		if (pc.problem) contextParts.push(`Problem: ${pc.problem}`);
		if (pc.budget) contextParts.push(`Budget: ${pc.budget}`);
		if (pc.teamSize) contextParts.push(`Team size: ${pc.teamSize}`);
		if (pc.vendors?.length) contextParts.push(`Vendors being evaluated: ${pc.vendors.join(', ')}`);
		contextParts.push('=== END PROJECT ===');
		contextParts.push('Tailor your responses to this specific project context.');
		systemPrompt += contextParts.join('\n');
	}

	// Inject company profile if available
	if (body.companyProfile && Object.keys(body.companyProfile).length > 0) {
		const cp = body.companyProfile;
		const parts: string[] = ['\n\n=== BUYER CONTEXT ==='];
		if (cp.name) parts.push(`Company: ${cp.name}`);
		if (cp.industry) parts.push(`Industry: ${cp.industry}`);
		if (cp.size) parts.push(`Size: ${cp.size}`);
		if (cp.budget) parts.push(`Budget: ${cp.budget}`);
		if (cp.compliance) parts.push(`Compliance: ${Array.isArray(cp.compliance) ? cp.compliance.join(', ') : cp.compliance}`);
		parts.push('=== END BUYER CONTEXT ===');
		systemPrompt += parts.join('\n');
	}

	const userContent = typeof body.context === 'string' ? body.context : JSON.stringify(body.context);

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': env.ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model,
			max_tokens: 4096,
			stream: true,
			system: systemPrompt,
			messages: [{ role: 'user', content: userContent }]
		})
	});

	if (!response.ok || !response.body) {
		error(502, 'AI streaming failed');
	}

	// Pass through the SSE stream
	return new Response(response.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
