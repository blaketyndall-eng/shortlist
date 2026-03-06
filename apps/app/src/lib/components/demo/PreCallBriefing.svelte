<script lang="ts">
	import Button from '$components/ui/Button.svelte';

	interface BriefingCard {
		type: string;
		color: string;
		icon: string;
		title: string;
		body: string;
	}

	let {
		cards = [],
		vendorName,
		onclose,
	}: {
		cards: BriefingCard[];
		vendorName: string;
		onclose: () => void;
	} = $props();

	let currentIdx = $state(0);
	const current = $derived(cards[currentIdx] ?? null);
	const progress = $derived(cards.length > 0 ? ((currentIdx + 1) / cards.length) * 100 : 0);
	const isLast = $derived(currentIdx >= cards.length - 1);

	function nav(dir: -1 | 1) {
		const next = currentIdx + dir;
		if (next >= 0 && next < cards.length) {
			currentIdx = next;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') nav(1);
		else if (e.key === 'ArrowLeft') nav(-1);
		else if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="briefing-overlay">
	<div class="briefing-container">
		<div class="briefing-header">
			<button class="briefing-back" onclick={onclose}>← Back</button>
			<div class="briefing-prog-track">
				<div class="briefing-prog-fill" style="width: {progress}%"></div>
			</div>
			<span class="briefing-label">Pre-Call Briefing</span>
		</div>

		<div class="briefing-stage">
			{#if current}
				<div class="briefing-card" style="border-color: {current.color}20">
					<div class="bc-type" style="color: {current.color}">
						<span class="bc-icon">{current.icon}</span>
						{current.type}
					</div>
					<h2 class="bc-title">{current.title}</h2>
					<div class="bc-body">{@html current.body}</div>
				</div>
			{/if}
		</div>

		<div class="briefing-nav">
			<button class="bnav-btn" onclick={() => nav(-1)} disabled={currentIdx === 0}>
				← Prev
			</button>
			<span class="bnav-pos">{currentIdx + 1} / {cards.length}</span>
			{#if isLast}
				<Button variant="primary" size="sm" onclick={onclose}>
					Ready for Demo →
				</Button>
			{:else}
				<button class="bnav-btn" onclick={() => nav(1)}>
					Next →
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.briefing-overlay {
		position: fixed; inset: 0; z-index: 100;
		background: white;
		display: flex; flex-direction: column;
	}
	.briefing-container {
		max-width: 640px; margin: 0 auto; width: 100%;
		display: flex; flex-direction: column; height: 100%;
		padding: var(--space-4);
	}

	.briefing-header {
		display: flex; align-items: center; gap: var(--space-3);
		padding-bottom: var(--space-4);
	}
	.briefing-back {
		background: none; border: none; cursor: pointer;
		font-size: 0.875rem; color: var(--neutral-500);
		padding: var(--space-1) var(--space-2); border-radius: var(--radius-md);
	}
	.briefing-back:hover { background: var(--neutral-100); }
	.briefing-prog-track {
		flex: 1; height: 4px; background: var(--neutral-100);
		border-radius: 2px; overflow: hidden;
	}
	.briefing-prog-fill {
		height: 100%; background: linear-gradient(90deg, #00cc96, #4a96f8);
		border-radius: 2px; transition: width 0.3s;
	}
	.briefing-label { font-size: 0.8125rem; color: var(--neutral-500); font-weight: 600; white-space: nowrap; }

	.briefing-stage {
		flex: 1; display: flex; align-items: center; justify-content: center;
		padding: var(--space-6) 0;
	}

	.briefing-card {
		width: 100%; max-width: 540px;
		padding: var(--space-6);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
	}

	.bc-type {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 1px; display: flex; align-items: center;
		gap: var(--space-1); margin-bottom: var(--space-4);
	}
	.bc-icon { font-size: 1rem; }

	.bc-title {
		font-size: 1.375rem; font-weight: 700; color: var(--neutral-900);
		line-height: 1.4; margin-bottom: var(--space-4);
	}

	.bc-body {
		font-size: 0.9375rem; color: var(--neutral-600);
		line-height: 1.7;
	}
	.bc-body :global(ul) { padding-left: var(--space-4); margin: var(--space-2) 0; }
	.bc-body :global(li) { margin-bottom: var(--space-1); }
	.bc-body :global(strong) { color: var(--neutral-800); }

	.briefing-nav {
		display: flex; align-items: center; justify-content: center;
		gap: var(--space-6); padding: var(--space-4) 0;
	}
	.bnav-btn {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md); border: 1px solid var(--neutral-200);
		background: white; color: var(--neutral-600);
		font-size: 0.875rem; font-weight: 500; cursor: pointer;
		transition: all 0.15s;
	}
	.bnav-btn:hover:not(:disabled) { background: var(--neutral-50); border-color: var(--neutral-300); }
	.bnav-btn:disabled { opacity: 0.3; cursor: default; }
	.bnav-pos { font-size: 0.875rem; color: var(--neutral-400); font-weight: 500; }
</style>
