<script lang="ts">
	let {
		engine,
		projectId,
		outputSnapshot = null,
		contextSnapshot = null,
		compact = false,
	}: {
		engine: string;
		projectId: string;
		outputSnapshot?: unknown;
		contextSnapshot?: unknown;
		compact?: boolean;
	} = $props();

	let rating = $state<1 | -1 | null>(null);
	let showComment = $state(false);
	let comment = $state('');
	let submitted = $state(false);
	let submitting = $state(false);

	async function submitFeedback(value: 1 | -1) {
		if (submitted || submitting) return;
		rating = value;
		submitting = true;

		try {
			await fetch('/api/ai/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine,
					projectId,
					rating: value,
					comment: comment || null,
					outputSnapshot: outputSnapshot ? JSON.stringify(outputSnapshot).slice(0, 2000) : null,
					contextSnapshot: contextSnapshot ? JSON.stringify(contextSnapshot).slice(0, 1000) : null,
				}),
			});
			submitted = true;
		} catch {
			// Silently fail — feedback is non-critical
		} finally {
			submitting = false;
		}
	}

	async function submitComment() {
		if (!comment.trim() || !rating) return;
		submitting = true;
		try {
			await fetch('/api/ai/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine,
					projectId,
					rating,
					comment,
					outputSnapshot: outputSnapshot ? JSON.stringify(outputSnapshot).slice(0, 2000) : null,
					contextSnapshot: contextSnapshot ? JSON.stringify(contextSnapshot).slice(0, 1000) : null,
				}),
			});
		} catch {
			// Silently fail
		} finally {
			submitting = false;
			showComment = false;
		}
	}
</script>

<div class="ai-feedback" class:compact>
	{#if submitted}
		<span class="feedback-thanks">Thanks for the feedback</span>
		{#if !showComment && rating === -1}
			<button class="feedback-comment-btn" onclick={() => (showComment = true)}>
				Tell us more
			</button>
		{/if}
	{:else}
		<span class="feedback-label">Was this helpful?</span>
		<button
			class="feedback-btn"
			class:active={rating === 1}
			disabled={submitting}
			onclick={() => submitFeedback(1)}
			title="Helpful"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
			</svg>
		</button>
		<button
			class="feedback-btn"
			class:active={rating === -1}
			disabled={submitting}
			onclick={() => submitFeedback(-1)}
			title="Not helpful"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
			</svg>
		</button>
	{/if}

	{#if showComment}
		<div class="feedback-comment">
			<input
				type="text"
				bind:value={comment}
				placeholder="What could be better?"
				onkeydown={(e) => e.key === 'Enter' && submitComment()}
			/>
			<button onclick={submitComment} disabled={submitting || !comment.trim()}>Send</button>
		</div>
	{/if}
</div>

<style>
	.ai-feedback {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: #8b95a5;
		margin-top: 0.5rem;
	}

	.ai-feedback.compact {
		margin-top: 0.25rem;
		font-size: 0.7rem;
	}

	.feedback-label {
		opacity: 0.7;
	}

	.feedback-btn {
		background: none;
		border: 1px solid transparent;
		color: #6b7685;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		transition: all 0.15s ease;
	}

	.feedback-btn:hover {
		color: #c8d1dc;
		border-color: #2a3040;
		background: rgba(255, 255, 255, 0.03);
	}

	.feedback-btn.active {
		color: #00cc96;
		border-color: rgba(0, 204, 150, 0.3);
		background: rgba(0, 204, 150, 0.08);
	}

	.feedback-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.feedback-thanks {
		color: #00cc96;
		font-size: 0.7rem;
	}

	.feedback-comment-btn {
		background: none;
		border: none;
		color: #4a96f8;
		cursor: pointer;
		font-size: 0.7rem;
		text-decoration: underline;
		padding: 0;
	}

	.feedback-comment {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.25rem;
	}

	.feedback-comment input {
		background: #141a24;
		border: 1px solid #2a3040;
		color: #c8d1dc;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.7rem;
		width: 200px;
	}

	.feedback-comment button {
		background: #00cc96;
		border: none;
		color: #0b1017;
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
	}

	.feedback-comment button:disabled {
		opacity: 0.5;
	}
</style>
