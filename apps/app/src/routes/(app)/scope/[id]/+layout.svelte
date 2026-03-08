<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ScopeProgressBar from '$lib/components/scope/ScopeProgressBar.svelte';

	let { children } = $props();

	const STEP_ORDER = ['signal', 'cause', 'options', 'prepare', 'endorse'];
	const SUBTITLES: Record<string, string> = {
		signal: 'What triggered this? Capture the problem signal.',
		cause: 'Why is this happening? Diagnose the root cause.',
		options: 'What are our options? Evaluate approaches.',
		prepare: 'Are we ready? Assess readiness and plan.',
		endorse: 'Get buy-in. Generate and approve the decision brief.',
	};

	let scope = $state<any>(null);
	let loading = $state(true);

	const scopeId = $derived($page.params.id);
	const currentPathStep = $derived($page.url.pathname.split('/').pop() ?? 'signal');
	const currentStep = $derived(scope?.current_step ?? currentPathStep);
	const subtitle = $derived(SUBTITLES[currentPathStep] ?? SUBTITLES.signal);

	const completedSteps = $derived.by(() => {
		if (!scope) return [];
		const idx = STEP_ORDER.indexOf(scope.current_step);
		return STEP_ORDER.slice(0, idx);
	});

	async function loadScope() {
		loading = true;
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) scope = await res.json();
		} catch { /* handled */ }
		loading = false;
	}

	onMount(() => { loadScope(); });
</script>

<div class="scope-layout">
	{#if loading}
		<div class="scope-loading">Loading SCOPE...</div>
	{:else if scope}
		<header class="scope-header">
			<div class="scope-title-row">
				<a href="/dashboard" class="back-link" aria-label="Back to dashboard">←</a>
				<div>
					<h1>{scope.name}</h1>
					<p class="scope-subtitle">{subtitle}</p>
				</div>
				<span class="scope-badge">SCOPE</span>
			</div>

			<ScopeProgressBar currentStep={currentPathStep} {completedSteps} />
		</header>

		<div class="scope-content">
			{@render children()}
		</div>
	{:else}
		<div class="scope-error">
			<p>SCOPE not found.</p>
			<a href="/dashboard">← Back to Dashboard</a>
		</div>
	{/if}
</div>

<style>
	.scope-layout {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-6);
	}

	.scope-loading {
		text-align: center;
		padding: var(--space-8);
		color: var(--text-muted, #94a3b8);
	}

	.scope-header { margin-bottom: var(--space-5); }

	.scope-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.back-link {
		font-size: 1.25rem;
		color: var(--text-muted, #94a3b8);
		text-decoration: none;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md, 8px);
		transition: all 0.15s;
	}
	.back-link:hover {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text, #e2e8f0);
		text-decoration: none;
	}

	.scope-title-row h1 {
		font-size: 1.25rem;
		margin-bottom: 0;
		color: var(--text, #e2e8f0);
	}

	.scope-subtitle {
		font-size: 0.8125rem;
		color: var(--text-muted, #94a3b8);
		margin: 0;
	}

	.scope-badge {
		margin-left: auto;
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		padding: 3px 10px;
		border-radius: 999px;
		background: rgba(0, 204, 150, 0.12);
		color: #00cc96;
	}

	.scope-content { min-height: 400px; }

	.scope-error {
		text-align: center;
		padding: var(--space-8);
		color: var(--text-muted, #94a3b8);
	}
	.scope-error a { color: #00cc96; }
</style>
