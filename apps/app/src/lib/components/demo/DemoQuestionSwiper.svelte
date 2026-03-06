<script lang="ts">
	import Button from '$components/ui/Button.svelte';

	interface DemoQuestion {
		id: string;
		text: string;
		crit: string;
		aiGenerated: boolean;
		why?: string;
	}

	let {
		questions = [],
		vendorName,
		onsave,
		onclose,
	}: {
		questions: DemoQuestion[];
		vendorName: string;
		onsave: (selected: DemoQuestion[]) => void;
		onclose: () => void;
	} = $props();

	let currentIdx = $state(0);
	let selected = $state<DemoQuestion[]>([]);
	let completed = $state(false);

	const current = $derived(questions[currentIdx] ?? null);
	const progress = $derived(questions.length > 0 ? ((currentIdx) / questions.length) * 100 : 0);

	function swipe(action: 'keep' | 'skip') {
		if (!current) return;
		if (action === 'keep') {
			selected = [...selected, current];
		}
		if (currentIdx < questions.length - 1) {
			currentIdx++;
		} else {
			completed = true;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (completed) return;
		if (e.key === 'ArrowRight' || e.key === 'Enter') swipe('keep');
		else if (e.key === 'ArrowLeft' || e.key === 'Backspace') swipe('skip');
	}

	function saveAndClose() {
		onsave(selected);
		onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="swiper-overlay">
	<div class="swiper-container">
		<div class="swiper-header">
			<button class="swiper-back" onclick={onclose}>← Back</button>
			<div class="swiper-prog-track">
				<div class="swiper-prog-fill" style="width: {progress}%"></div>
			</div>
			<span class="swiper-counter">{selected.length} selected</span>
		</div>

		{#if !completed}
			<div class="swiper-stage">
				{#if current}
					<div class="swipe-card" class:ai={current.aiGenerated}>
						<div class="card-type" class:ai-gen={current.aiGenerated}>
							{current.aiGenerated ? '✦ AI Generated' : current.crit}
						</div>
						<h2 class="card-question">{current.text}</h2>
						{#if current.why}
							<p class="card-why">{current.why}</p>
						{/if}
						<p class="card-hint">→ to add · ← to skip</p>
					</div>
				{/if}
			</div>

			<div class="swiper-nav">
				<button class="sw-btn sw-skip" onclick={() => swipe('skip')}>✕ Skip</button>
				<span class="sw-pos">{currentIdx + 1} / {questions.length}</span>
				<button class="sw-btn sw-keep" onclick={() => swipe('keep')}>✓ Keep</button>
			</div>
		{:else}
			<div class="swiper-stage">
				<div class="swipe-card complete-card">
					<div class="complete-icon">✓</div>
					<h2>Questions Ready</h2>
					<p class="complete-count">{selected.length} of {questions.length} questions selected for {vendorName}</p>
					<Button variant="primary" onclick={saveAndClose}>
						Save & Continue →
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.swiper-overlay {
		position: fixed; inset: 0; z-index: 100;
		background: var(--color-bg-secondary);
		display: flex; flex-direction: column;
	}
	.swiper-container {
		max-width: 640px; margin: 0 auto; width: 100%;
		display: flex; flex-direction: column; height: 100%;
		padding: var(--space-4);
	}

	.swiper-header {
		display: flex; align-items: center; gap: var(--space-3);
		padding-bottom: var(--space-4);
	}
	.swiper-back {
		background: none; border: none; cursor: pointer;
		font-size: 0.875rem; color: var(--neutral-500);
		padding: var(--space-1) var(--space-2); border-radius: var(--radius-md);
	}
	.swiper-back:hover { background: var(--neutral-100); }
	.swiper-prog-track {
		flex: 1; height: 4px; background: var(--neutral-100);
		border-radius: 2px; overflow: hidden;
	}
	.swiper-prog-fill {
		height: 100%; background: linear-gradient(90deg, #00cc96, #4a96f8);
		border-radius: 2px; transition: width 0.3s;
	}
	.swiper-counter { font-size: 0.8125rem; color: var(--neutral-500); font-weight: 600; white-space: nowrap; }

	.swiper-stage {
		flex: 1; display: flex; align-items: center; justify-content: center;
		padding: var(--space-6) 0;
	}

	.swipe-card {
		width: 100%; max-width: 540px;
		padding: var(--space-8) var(--space-6);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		text-align: center;
	}
	.swipe-card.ai { border-color: rgba(74, 150, 248, 0.3); }

	.card-type {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 1px; color: var(--primary-500); margin-bottom: var(--space-4);
	}
	.card-type.ai-gen { color: #4a96f8; }

	.card-question {
		font-size: 1.25rem; font-weight: 600; color: var(--neutral-900);
		line-height: 1.5; margin-bottom: var(--space-4);
	}

	.card-why {
		font-size: 0.8125rem; color: var(--neutral-500);
		line-height: 1.5; margin-bottom: var(--space-3);
		font-style: italic;
	}
	.card-hint {
		font-size: 0.75rem; color: var(--neutral-400);
	}

	.swiper-nav {
		display: flex; align-items: center; justify-content: center;
		gap: var(--space-6); padding: var(--space-4) 0;
	}
	.sw-btn {
		padding: var(--space-2) var(--space-5);
		border-radius: 999px; border: 2px solid;
		font-size: 0.9375rem; font-weight: 600;
		cursor: pointer; transition: all 0.15s;
	}
	.sw-skip {
		border-color: var(--neutral-300); background: var(--color-bg-secondary); color: var(--neutral-600);
	}
	.sw-skip:hover { border-color: #f05050; color: #f05050; background: rgba(240, 80, 80, 0.04); }
	.sw-keep {
		border-color: #00cc96; background: rgba(0, 204, 150, 0.06); color: #00cc96;
	}
	.sw-keep:hover { background: rgba(0, 204, 150, 0.12); }
	.sw-pos { font-size: 0.875rem; color: var(--neutral-400); font-weight: 500; }

	.complete-card { background: var(--neutral-50); }
	.complete-icon {
		width: 48px; height: 48px; border-radius: 50%;
		background: rgba(0, 204, 150, 0.12); color: #00cc96;
		display: flex; align-items: center; justify-content: center;
		font-size: 1.25rem; font-weight: 700; margin: 0 auto var(--space-4);
	}
	.complete-count {
		font-size: 0.875rem; color: var(--neutral-500); margin-bottom: var(--space-4);
	}
</style>
