<script lang="ts">
	import Button from '$components/ui/Button.svelte';

	interface FeedbackCard {
		type: 'overall' | 'prompt' | 'criteria' | 'complete';
		label: string;
		criterionName?: string;
		criterionWeight?: number;
		promptText?: string;
		promptIndex?: number;
	}

	let {
		cards = [],
		vendorName,
		sessionId,
		onsave,
		onclose,
	}: {
		cards: FeedbackCard[];
		vendorName: string;
		sessionId: string;
		onsave: (feedback: { overallScore: number; notes: string; criteriaScores: Record<string, number>; prompts: Record<number, string> }) => void;
		onclose: () => void;
	} = $props();

	let currentIdx = $state(0);
	let overallScore = $state(7);
	let notes = $state('');
	let criteriaScores = $state<Record<string, number>>({});
	let promptResponses = $state<Record<number, string>>({});

	const current = $derived(cards[currentIdx] ?? null);
	const progress = $derived(cards.length > 0 ? ((currentIdx + 1) / cards.length) * 100 : 0);
	const isLast = $derived(currentIdx >= cards.length - 1);

	function nav(dir: -1 | 1) {
		const next = currentIdx + dir;
		if (next >= 0 && next < cards.length) {
			currentIdx = next;
		}
	}

	function submitFeedback() {
		onsave({
			overallScore,
			notes,
			criteriaScores,
			prompts: promptResponses,
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function getScoreLabel(score: number): string {
		if (score >= 9) return 'Outstanding';
		if (score >= 7) return 'Strong';
		if (score >= 5) return 'Adequate';
		if (score >= 3) return 'Weak';
		return 'Not useful';
	}

	function getScoreColor(score: number): string {
		if (score >= 7) return '#00cc96';
		if (score >= 4) return '#f0a034';
		return '#f05050';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="feedback-overlay">
	<div class="feedback-container">
		<div class="feedback-header">
			<button class="feedback-back" onclick={onclose}>← Back</button>
			<div class="feedback-prog-track">
				<div class="feedback-prog-fill" style="width: {progress}%"></div>
			</div>
			<span class="feedback-label">Post-Demo Feedback</span>
		</div>

		<div class="feedback-stage">
			{#if current?.type === 'overall'}
				<div class="fb-card">
					<div class="fb-type">Overall Rating</div>
					<h2>How was the {vendorName} demo?</h2>
					<div class="fb-score-display" style="color: {getScoreColor(overallScore)}">
						{overallScore}
					</div>
					<div class="fb-score-label">{getScoreLabel(overallScore)}</div>
					<input
						type="range"
						min="1"
						max="10"
						bind:value={overallScore}
						class="fb-slider"
					/>
					<div class="fb-slider-labels">
						<span>1 — Not useful</span>
						<span>10 — Outstanding</span>
					</div>
					<textarea
						bind:value={notes}
						placeholder="Any overall notes or impressions..."
						class="fb-notes"
						rows="3"
					></textarea>
				</div>

			{:else if current?.type === 'prompt'}
				<div class="fb-card">
					<div class="fb-type">Feedback Prompt</div>
					<h2>{current.promptText}</h2>
					<textarea
						bind:value={promptResponses[current.promptIndex ?? 0]}
						placeholder="Your thoughts..."
						class="fb-textarea"
						rows="5"
					></textarea>
				</div>

			{:else if current?.type === 'criteria'}
				<div class="fb-card">
					<div class="fb-type">Criteria Score</div>
					<h2>{current.criterionName}</h2>
					{#if current.criterionWeight}
						<p class="fb-weight">Weight: {current.criterionWeight}%</p>
					{/if}
					<div class="fb-score-display" style="color: {getScoreColor(criteriaScores[current.criterionName ?? ''] ?? 5)}">
						{criteriaScores[current.criterionName ?? ''] ?? 5}
					</div>
					<input
						type="range"
						min="1"
						max="10"
						value={criteriaScores[current.criterionName ?? ''] ?? 5}
						oninput={(e) => {
							const val = parseInt((e.target as HTMLInputElement).value);
							if (current?.criterionName) criteriaScores[current.criterionName] = val;
						}}
						class="fb-slider"
					/>
					<div class="fb-slider-labels">
						<span>1 — Poor</span>
						<span>10 — Excellent</span>
					</div>
				</div>

			{:else if current?.type === 'complete'}
				<div class="fb-card complete-card">
					<div class="fb-complete-icon">✓</div>
					<h2>Feedback Ready</h2>
					<p>Your scores and notes for {vendorName} will be saved.</p>
					<Button variant="primary" onclick={submitFeedback}>
						Save & View Report →
					</Button>
				</div>
			{/if}
		</div>

		{#if current?.type !== 'complete'}
			<div class="feedback-nav">
				<button class="fnav-btn" onclick={() => nav(-1)} disabled={currentIdx === 0}>
					← Prev
				</button>
				<span class="fnav-pos">{currentIdx + 1} / {cards.length}</span>
				<button class="fnav-btn" onclick={() => nav(1)}>
					{isLast ? 'Review' : 'Next'} →
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.feedback-overlay {
		position: fixed; inset: 0; z-index: 100;
		background: white;
		display: flex; flex-direction: column;
	}
	.feedback-container {
		max-width: 640px; margin: 0 auto; width: 100%;
		display: flex; flex-direction: column; height: 100%;
		padding: var(--space-4);
	}

	.feedback-header {
		display: flex; align-items: center; gap: var(--space-3);
		padding-bottom: var(--space-4);
	}
	.feedback-back {
		background: none; border: none; cursor: pointer;
		font-size: 0.875rem; color: var(--neutral-500);
		padding: var(--space-1) var(--space-2); border-radius: var(--radius-md);
	}
	.feedback-back:hover { background: var(--neutral-100); }
	.feedback-prog-track {
		flex: 1; height: 4px; background: var(--neutral-100);
		border-radius: 2px; overflow: hidden;
	}
	.feedback-prog-fill {
		height: 100%; background: linear-gradient(90deg, #4a96f8, #a06cf0);
		border-radius: 2px; transition: width 0.3s;
	}
	.feedback-label { font-size: 0.8125rem; color: var(--neutral-500); font-weight: 600; white-space: nowrap; }

	.feedback-stage {
		flex: 1; display: flex; align-items: center; justify-content: center;
		padding: var(--space-6) 0;
	}

	.fb-card {
		width: 100%; max-width: 540px;
		padding: var(--space-6);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.fb-type {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 1px; color: var(--primary-500); margin-bottom: var(--space-4);
	}

	.fb-card h2 {
		font-size: 1.25rem; font-weight: 600; color: var(--neutral-900);
		line-height: 1.5; margin-bottom: var(--space-4);
	}

	.fb-weight {
		font-size: 0.8125rem; color: var(--neutral-500); margin-bottom: var(--space-3);
	}

	.fb-score-display {
		font-family: 'Playfair Display', serif;
		font-size: 3rem; font-weight: 700;
		margin-bottom: var(--space-2);
	}
	.fb-score-label {
		font-size: 0.875rem; font-weight: 500; color: var(--neutral-500);
		margin-bottom: var(--space-4);
	}

	.fb-slider {
		width: 100%; max-width: 400px;
		margin: 0 auto var(--space-2);
		display: block;
		accent-color: var(--primary-500);
	}
	.fb-slider-labels {
		display: flex; justify-content: space-between;
		font-size: 0.6875rem; color: var(--neutral-400);
		max-width: 400px; margin: 0 auto var(--space-4);
	}

	.fb-notes, .fb-textarea {
		width: 100%; max-width: 400px;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.875rem; font-family: inherit;
		resize: vertical; text-align: left;
	}
	.fb-notes:focus, .fb-textarea:focus {
		outline: none; border-color: var(--primary-400);
	}

	.complete-card { background: var(--neutral-50); }
	.fb-complete-icon {
		width: 48px; height: 48px; border-radius: 50%;
		background: rgba(0, 204, 150, 0.12); color: #00cc96;
		display: flex; align-items: center; justify-content: center;
		font-size: 1.25rem; font-weight: 700; margin: 0 auto var(--space-4);
	}
	.complete-card p { font-size: 0.875rem; color: var(--neutral-500); margin-bottom: var(--space-4); }

	.feedback-nav {
		display: flex; align-items: center; justify-content: center;
		gap: var(--space-6); padding: var(--space-4) 0;
	}
	.fnav-btn {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md); border: 1px solid var(--neutral-200);
		background: white; color: var(--neutral-600);
		font-size: 0.875rem; font-weight: 500; cursor: pointer;
		transition: all 0.15s;
	}
	.fnav-btn:hover:not(:disabled) { background: var(--neutral-50); border-color: var(--neutral-300); }
	.fnav-btn:disabled { opacity: 0.3; cursor: default; }
	.fnav-pos { font-size: 0.875rem; color: var(--neutral-400); font-weight: 500; }
</style>
