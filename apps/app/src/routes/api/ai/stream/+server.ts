import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ANTHROPIC_API_KEY } from '$env/static/private';

/**
 * Streaming AI endpoint — returns Server-Sent Events.
 * Used for chat-like interactions where progressive display is needed.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	if (!ANTHROPIC_API_KEY) {
		error(500, 'AI service not configured');
	}

	const body = await request.json();
	const model = body.depth === 'quick' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model,
			max_tokens: 4096,
			stream: true,
			system: 'You are Shortlist AI, a procurement intelligence assistant. Be concise and actionable.',
			messages: [
				{
					role: 'user',
					content: typeof body.context === 'string' ? body.context : JSON.stringify(body.context)
				}
			]
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
