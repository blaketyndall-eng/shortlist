<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ScopeProgressBar from '$lib/components/scope/ScopeProgressBar.svelte';
	import type { Scope, ScopeStep } from '@shortlist/shared-types';
	import { SCOPE_DESCRIPTIONS } from '@shortlist/shared-types';

	let { children } = $props();

	let scope = $state<Scope | null>(null);
	let loading = $state(true);
	let error = $state('');

	const scopeId = $derived($page.params.id);
	const currentStep = $derived<ScopeStep>(
		(scope?.current_step as ScopeStep) ?? 'signal'
	);
	const stepDescription = $derived(SCOPE_DESCRIPTIONS[currentStep] ?? '');

	async function loadScope() {
		loading = true;
		try {
			const res = await fetch(`/api/scopes/${scopeId}`);
			if (res.ok) {
				const data = await res.json();
				scope = data.scope;
			} else {
				error = 'SCOPE session not found';
			}
		} catch {
			error = 'Failed to load SCOPE session';
		} finally {
			loading = false;
		}
	}

	onMount(() => { loadScope(); });
</script>

<div class="scope-layout">
	{#if loading}
		<div class="loading-state">Loading SCOPE session...</div>
	{:else if error}
		<div class="error-state">
			<p>{error}</p>
			<a href="/dashboard" class="back-link">Back to Dashboard</a>
		</div>
	{:else if scope}
		<header class="scope-header">
			<div class="scope-title">
				<a href="/dashboard" class="back-link" aria-label="Back to dashboard">←</a>
				<div>
					<h1>{scope.name}</h1>
					<span class="scope-subtitle">{stepDescription}</span>
				</div>
				<span class="scope-badge">SCOPE</span>
			</div>

			<ScopeProgressBar {currentStep} {scopeId} />
		</header>

		<div class="scope-content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.scope-layout {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-6);
	}

	.scope-header {
		margin-bottom: var(--space-6);
	}

	.scope-title {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.back-link {
		font-size: 1.25rem;
		color: var(--neutral-400);
		text-decoration: none;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.back-link:hover {
		background: var(--neutral-100);
		color: var(--neutral-700);
		text-decoration: none;
	}

	.scope-title h1 {
		font-size: 1.25rem;
		margin-bottom: 0;
	}

	.scope-subtitle {
		font-size: 0.8125rem;
		color: var(--neutral-500);
	}

	.scope-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 10px;
		border-radius: 999px;
		margin-left: auto;
		background: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
	}

	.scope-content {
		min-height: 400px;
	}

	.loading-state, .error-state {
		text-align: center;
		padding: var(--space-12) var(--space-4);
		color: var(--neutral-500);
	}

	.error-state .back-link {
		display: inline-block;
		margin-top: var(--space-4);
		color: var(--primary-600);
		font-size: 0.875rem;
		width: auto;
		height: auto;
	}
</style>
