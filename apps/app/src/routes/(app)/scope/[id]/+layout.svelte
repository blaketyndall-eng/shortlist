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
	let showAbandon = $state(false);
	let abandoning = $state(false);

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

	async function abandonScope() {
		abandoning = true;
		try {
			const res = await fetch(`/api/scopes/${scopeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'abandoned' }),
			});
			if (res.ok) {
				const { goto } = await import('$app/navigation');
				goto('/dashboard');
			}
		} catch {
			showAbandon = false;
			abandoning = false;
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

			<button class="abandon-trigger" onclick={() => (showAbandon = true)}>
				Abandon SCOPE
			</button>
		</header>

		{#if showAbandon}
			<div class="abandon-overlay" role="dialog" aria-modal="true">
				<div class="abandon-dialog">
					<h3>Abandon this SCOPE?</h3>
					<p>This will mark "{scope.name}" as abandoned. It won't appear on your dashboard and no project will be created. You can't undo this.</p>
					<div class="abandon-actions">
						<button class="abandon-cancel" onclick={() => (showAbandon = false)} disabled={abandoning}>
							Keep working
						</button>
						<button class="abandon-confirm" onclick={abandonScope} disabled={abandoning}>
							{abandoning ? 'Abandoning…' : 'Yes, abandon'}
						</button>
					</div>
				</div>
			</div>
		{/if}

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

	.abandon-trigger {
		display: block;
		margin-top: var(--space-3);
		margin-left: auto;
		background: none;
		border: none;
		color: var(--neutral-400);
		font-size: 0.75rem;
		cursor: pointer;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		transition: color var(--transition-fast);
	}
	.abandon-trigger:hover { color: #f05050; }

	.abandon-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.abandon-dialog {
		background: var(--color-bg-secondary, white);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		max-width: 420px;
		width: 90%;
	}
	.abandon-dialog h3 { margin-bottom: var(--space-2); font-size: 1rem; }
	.abandon-dialog p { color: var(--neutral-500); font-size: 0.875rem; line-height: 1.5; margin-bottom: var(--space-5); }
	.abandon-actions { display: flex; gap: var(--space-3); justify-content: flex-end; }
	.abandon-cancel {
		padding: var(--space-2) var(--space-4);
		background: none; border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); font-size: 0.875rem;
		cursor: pointer; color: var(--neutral-600);
	}
	.abandon-cancel:hover { background: var(--neutral-50); }
	.abandon-confirm {
		padding: var(--space-2) var(--space-4);
		background: #f05050; border: none;
		border-radius: var(--radius-md); font-size: 0.875rem;
		color: white; font-weight: 500; cursor: pointer;
	}
	.abandon-confirm:hover { background: #e04040; }
	.abandon-confirm:disabled, .abandon-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
