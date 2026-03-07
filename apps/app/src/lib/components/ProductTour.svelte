<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	interface TourStep {
		title: string;
		description: string;
		target?: string;
		icon: string;
		highlight?: string;
	}

	interface Props {
		open?: boolean;
		profileId: string;
		onclose?: () => void;
	}

	let { open = $bindable(true), profileId, onclose }: Props = $props();
	const supabase = createSupabaseBrowserClient();

	let currentStep = $state(0);

	const steps: TourStep[] = [
		{
			title: 'Welcome to Shortlist',
			description: 'Shortlist is your AI-powered purchase intelligence platform. We help your team discover, evaluate, and select the right vendors — faster and smarter than spreadsheets.',
			icon: 'wave',
			highlight: 'overview'
		},
		{
			title: 'The SOLVE Workflow',
			description: 'Every project follows our proven SOLVE methodology: Scope your needs, Observe the market, Leverage AI insights, Validate with your team, and Execute the decision. Each step builds on the last.',
			icon: 'workflow',
			highlight: 'solve'
		},
		{
			title: 'Discover Vendors',
			description: 'Browse our library of 170+ pre-vetted vendors across 8 categories. AI enrichment automatically pulls pricing, features, and compatibility data so you don\'t have to.',
			icon: 'search',
			highlight: 'discover'
		},
		{
			title: 'AI-Powered Analysis',
			description: 'Our AI engine analyzes vendors against your specific criteria, generates fit scores, and surfaces risks you might miss. It learns from your Company Profile to personalize every recommendation.',
			icon: 'ai',
			highlight: 'ai'
		},
		{
			title: 'Team Collaboration',
			description: 'Invite your team to rate vendors, vote on priorities, and build alignment. Shortlist tracks consensus and flags disagreements so nothing gets overlooked.',
			icon: 'team',
			highlight: 'team'
		},
		{
			title: 'Decision Reports',
			description: 'When you\'re ready to decide, Shortlist generates a professional vendor comparison report you can share with stakeholders. Data-driven, unbiased, and ready for sign-off.',
			icon: 'report',
			highlight: 'report'
		}
	];

	const totalSteps = steps.length;
	const isFirst = $derived(currentStep === 0);
	const isLast = $derived(currentStep === totalSteps - 1);
	const step = $derived(steps[currentStep]);
	const progressPct = $derived(((currentStep + 1) / totalSteps) * 100);

	function next() {
		if (isLast) {
			finish();
		} else {
			currentStep++;
		}
	}

	function prev() {
		if (currentStep > 0) currentStep--;
	}

	async function finish() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') finish();
		if (e.key === 'ArrowRight') next();
		if (e.key === 'ArrowLeft') prev();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) finish();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="tour-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="Product tour"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="tour-card">
			<!-- Progress bar -->
			<div class="tour-progress">
				<div class="tour-progress-fill" style="width: {progressPct}%"></div>
			</div>

			<!-- Step indicator -->
			<div class="step-indicator">
				<span class="step-count">{currentStep + 1} of {totalSteps}</span>
			</div>

			<!-- Illustration area -->
			<div class="tour-illustration">
				{#if step.icon === 'wave'}
					<div class="tour-hero">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="30" fill="rgba(0, 204, 150, 0.08)" stroke="rgba(0, 204, 150, 0.2)" stroke-width="1.5"/>
							<path d="M22 32c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#00cc96" stroke-width="2.5" stroke-linecap="round"/>
							<circle cx="32" cy="32" r="3" fill="#00cc96"/>
							<path d="M20 26l-3-3M44 26l3-3M32 19v-4" stroke="#00cc96" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</div>
				{:else if step.icon === 'workflow'}
					<div class="tour-hero">
						<div class="solve-letters">
							<span class="solve-letter" style="--delay: 0">S</span>
							<span class="solve-letter" style="--delay: 1">O</span>
							<span class="solve-letter" style="--delay: 2">L</span>
							<span class="solve-letter" style="--delay: 3">V</span>
							<span class="solve-letter" style="--delay: 4">E</span>
						</div>
					</div>
				{:else if step.icon === 'search'}
					<div class="tour-hero">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="30" fill="rgba(74, 150, 248, 0.08)" stroke="rgba(74, 150, 248, 0.2)" stroke-width="1.5"/>
							<circle cx="28" cy="28" r="10" stroke="#4a96f8" stroke-width="2.5"/>
							<path d="M36 36l8 8" stroke="#4a96f8" stroke-width="2.5" stroke-linecap="round"/>
							<text x="25" y="32" fill="#4a96f8" font-size="10" font-weight="700">170+</text>
						</svg>
					</div>
				{:else if step.icon === 'ai'}
					<div class="tour-hero">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="30" fill="rgba(0, 204, 150, 0.08)" stroke="rgba(0, 204, 150, 0.2)" stroke-width="1.5"/>
							<path d="M24 20h16M20 28h24M22 36h20M26 44h12" stroke="#00cc96" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
							<text x="22" y="35" fill="#00cc96" font-size="16" font-weight="800">✦</text>
						</svg>
					</div>
				{:else if step.icon === 'team'}
					<div class="tour-hero">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="30" fill="rgba(240, 160, 52, 0.08)" stroke="rgba(240, 160, 52, 0.2)" stroke-width="1.5"/>
							<circle cx="24" cy="26" r="5" stroke="#f0a034" stroke-width="2"/>
							<circle cx="40" cy="26" r="5" stroke="#f0a034" stroke-width="2"/>
							<path d="M16 44c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#f0a034" stroke-width="2" stroke-linecap="round"/>
							<path d="M32 44c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#f0a034" stroke-width="2" stroke-linecap="round"/>
						</svg>
					</div>
				{:else if step.icon === 'report'}
					<div class="tour-hero">
						<svg width="64" height="64" viewBox="0 0 64 64" fill="none">
							<circle cx="32" cy="32" r="30" fill="rgba(0, 204, 150, 0.08)" stroke="rgba(0, 204, 150, 0.2)" stroke-width="1.5"/>
							<rect x="20" y="16" width="24" height="32" rx="3" stroke="#00cc96" stroke-width="2"/>
							<path d="M26 24h12M26 30h8M26 36h10" stroke="#00cc96" stroke-width="1.5" stroke-linecap="round"/>
							<path d="M26 42l4 3 6-6" stroke="#00cc96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				{/if}
			</div>

			<!-- Content -->
			<div class="tour-content">
				<h2>{step.title}</h2>
				<p>{step.description}</p>
			</div>

			<!-- Navigation -->
			<div class="tour-nav">
				{#if isFirst}
					<button class="tour-btn ghost" onclick={finish}>Skip tour</button>
				{:else}
					<button class="tour-btn ghost" onclick={prev}>← Back</button>
				{/if}

				<div class="tour-dots">
					{#each steps as _, i}
						<button
							class="tour-dot"
							class:active={i === currentStep}
							class:completed={i < currentStep}
							onclick={() => currentStep = i}
							aria-label="Go to step {i + 1}"
						></button>
					{/each}
				</div>

				<button class="tour-btn primary" onclick={next}>
					{isLast ? 'Get started' : 'Next →'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.tour-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: var(--space-4, 1rem);
		backdrop-filter: blur(4px);
	}

	.tour-card {
		background: var(--color-bg-secondary, #141b24);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 16px;
		width: 100%;
		max-width: 480px;
		overflow: hidden;
		box-shadow: 0 25px 50px rgba(0,0,0,0.4);
	}

	.tour-progress {
		height: 3px;
		background: rgba(255,255,255,0.06);
	}

	.tour-progress-fill {
		height: 100%;
		background: var(--color-primary, #00cc96);
		transition: width 0.3s ease;
		border-radius: 0 3px 3px 0;
	}

	.step-indicator {
		padding: var(--space-3, 0.75rem) var(--space-5, 1.25rem) 0;
		text-align: right;
	}

	.step-count {
		font-size: 0.6875rem;
		color: var(--neutral-500, #64748b);
		font-weight: 500;
	}

	.tour-illustration {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4, 1rem) 0;
	}

	.tour-hero {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.solve-letters {
		display: flex;
		gap: 6px;
	}

	.solve-letter {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		font-size: 1.25rem;
		font-weight: 800;
		font-family: var(--font-serif, 'Playfair Display', serif);
		animation: solve-pop 0.4s ease calc(var(--delay) * 0.08s) both;
	}

	.solve-letter:nth-child(1) { background: rgba(0, 204, 150, 0.15); color: #00cc96; }
	.solve-letter:nth-child(2) { background: rgba(74, 150, 248, 0.15); color: #4a96f8; }
	.solve-letter:nth-child(3) { background: rgba(240, 160, 52, 0.15); color: #f0a034; }
	.solve-letter:nth-child(4) { background: rgba(240, 80, 80, 0.15); color: #f05050; }
	.solve-letter:nth-child(5) { background: rgba(0, 204, 150, 0.15); color: #00cc96; }

	@keyframes solve-pop {
		0% { transform: scale(0.8); opacity: 0; }
		100% { transform: scale(1); opacity: 1; }
	}

	.tour-content {
		padding: 0 var(--space-6, 1.5rem) var(--space-4, 1rem);
		text-align: center;
	}

	.tour-content h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-heading, #e2e8f0);
		margin: 0 0 var(--space-2, 0.5rem);
	}

	.tour-content p {
		font-size: 0.875rem;
		color: var(--neutral-400, #94a3b8);
		line-height: 1.6;
		margin: 0;
	}

	.tour-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
		border-top: 1px solid rgba(255,255,255,0.06);
	}

	.tour-dots {
		display: flex;
		gap: 6px;
	}

	.tour-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255,255,255,0.15);
		border: none;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s;
	}

	.tour-dot.active {
		background: var(--color-primary, #00cc96);
		width: 20px;
		border-radius: 4px;
	}

	.tour-dot.completed {
		background: rgba(0, 204, 150, 0.4);
	}

	.tour-btn {
		border: none;
		border-radius: var(--radius-md, 8px);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.45rem 1rem;
		transition: all 0.15s;
		min-width: 90px;
	}

	.tour-btn.ghost {
		background: none;
		color: var(--neutral-500, #64748b);
	}

	.tour-btn.ghost:hover {
		color: var(--color-text, #e2e8f0);
	}

	.tour-btn.primary {
		background: var(--color-primary, #00cc96);
		color: #0b1017;
	}

	.tour-btn.primary:hover {
		opacity: 0.9;
	}
</style>
