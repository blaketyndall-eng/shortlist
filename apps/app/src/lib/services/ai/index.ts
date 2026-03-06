import type { AIModel, EngineName, EngineDepth, PipelineStage } from '@shortlist/shared-types/ai';

/**
 * AI Service — orchestrates calls to Claude via SvelteKit server routes.
 * All actual API calls happen server-side; this module provides
 * the client-facing interface and types.
 */

export interface AIRequest {
	engine: EngineName;
	depth: EngineDepth;
	context: Record<string, unknown>;
	projectId: string;
}

export interface AIResponse {
	engine: EngineName;
	stage: PipelineStage;
	result: unknown;
	model: AIModel;
	confidence: number;
	tokensUsed: { input: number; output: number };
}

/**
 * Call an AI engine via the server-side API route.
 * The server route handles model selection, rate limiting, and token tracking.
 */
export async function callEngine(request: AIRequest): Promise<AIResponse> {
	const response = await fetch('/api/ai/engine', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'AI request failed' }));
		throw new Error(error.message ?? `AI engine error: ${response.status}`);
	}

	return response.json();
}

/**
 * Stream an AI response (for chat-like interactions).
 */
export async function streamEngine(
	request: AIRequest,
	onChunk: (text: string) => void
): Promise<void> {
	const response = await fetch('/api/ai/stream', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request)
	});

	if (!response.ok || !response.body) {
		throw new Error('AI streaming failed');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		onChunk(decoder.decode(value, { stream: true }));
	}
}
