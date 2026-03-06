<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;
	const solveData = data.project.solve_data ?? {};

	let detecting = $state(false);
	let detected = $state(!!solveData.categoryDetected);
	let categoryName = $state<string>(solveData.categoryDetected ?? '');
	let confidence = $state<number>(solveData.categoryConfidence ?? 0);
	let alternatives = $state<{ name: string; confidence: number }[]>(solveData.categoryAlternatives ?? []);
	let saving = $state(false);

	// Approach selection
	type Approach = 'buy' | 'fix' | 'build' | 'hybrid';
	let selectedApproach = $state<Approach | null>(solveData.approach ?? null);

	const approaches: { key: Approach; icon: string; label: string; description: string }[] = [
		{ key: 'buy', icon: '🛒', label: 'Buy', description: 'Purchase a new tool or platform' },
		{ key: 'fix', icon: '🔧', label: 'Fix', description: 'Optimize or upgrade your current tool' },
		{ key: 'build', icon: '🏗️', label: 'Build', description: 'Build a custom internal solution' },
		{ key: 'hybrid', icon: '🔀', label: 'Hybrid', description: 'Combine multiple approaches' },
	];

	function confidenceColor(c: number): string {
		if (c >= 75) return '#00cc96';
		if (c >= 50) return '#f59e0b';
		return '#ef4444';
	}

	function confidenceLabel(c: number): string {
		if (c >= 75) return 'High confidence';
		if (c >= 50) return 'Needs more detail';
		return 'Low confidence';
	}

	async function runDetection() {
		detecting = true;

		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'category_detect',
					projectId,
					input: {
						triggers: solveData.triggers?.filter((t: any) => t.selected).map((t: any) => t.label) ?? [],
						problemDescription: solveData.triggerQuestions?.[0]?.answer ?? '',
						currentTool: solveData.triggerQuestions?.[5]?.answer ?? '',
						companySize: solveData.triggerQuestions?.[6]?.answer ?? '',
					},
				}),
			});

			if (res.ok) {
				const result = await res.json();
				categoryName = result.category ?? 'Unknown';
				confidence = result.confidence ?? 50;
				alternatives = result.alternatives ?? [];
				detected = true;
			} else {
				// Fallback: set a placeholder
				categoryName = 'Software Platform';
				confidence = 60;
				alternatives = [
					{ name: 'CRM', confidence: 45 },
					{ name: 'Project Management', confidence: 30 },
				];
				detected = true;
			}
		} catch {
			categoryName = 'Software Platform';
			confidence = 60;
			alternatives = [];
			detected = true;
		}

		detecting = false;
	}

	function overrideCategory(name: string) {
		categoryName = name;
		confidence = 100;
		alternatives = [];
	}

	async function saveAndContinue() {
		saving = true;

		const newSolveData = {
			...solveData,
			categoryDetected: categoryName,
			categoryConfidence: confidence,
			categoryAlternatives: alternatives,
			approach: selectedApproach,
			completedSteps: [...new Set([...(solveData.completedSteps ?? []), 'triggers', 'category'])],
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				category: categoryName,
				current_step: 'vendor_discovery',
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		goto(`/project/${projectId}/solve/discovery`);
	}

	const canContinue = $derived(detected && categoryName.length > 0);
</script>

<svelte:head>
	<title>Category Detection — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-category">
	<h2>AI Category Detection</h2>
	<p class="step-description">
		Based on your triggers and problem description, we'll identify the right software category.
	</p>

	{#if !detected}
		<Card>
			<div class="detection-prompt">
				<p>Ready to analyze your inputs and detect the software category.</p>
				<Button variant="primary" onclick={runDetection} loading={detecting}>
					{detecting ? 'Analyzing...' : 'Detect Category'}
				</Button>
			</div>
		</Card>
	{:else}
		<Card>
			<div class="detection-header">
				<span class="detection-label">AI CATEGORY DETECTION</span>
			</div>

			<div class="detection-result">
				<div class="confidence-bar">
					<div
						class="confidence-fill"
						style="width: {confidence}%; background: {confidenceColor(confidence)}"
					></div>
				</div>
				<span class="confidence-text" style="color: {confidenceColor(confidence)}">
					{confidenceLabel(confidence)} — {Math.round(confidence)}%
				</span>

				<div class="category-display">
					<h3 class="category-name">{categoryName}</h3>
				</div>

				{#if confidence < 60}
					<div class="low-confidence-alert">
						⚠️ Add more detail to your problem description to improve detection accuracy.
					</div>
				{/if}

				{#if alternatives.length > 0}
					<div class="alternatives">
						<span class="alt-label">Or did you mean:</span>
						{#each alternatives as alt}
							<button
								class="alt-link"
								onclick={() => overrideCategory(alt.name)}
								type="button"
							>
								{alt.name} ({Math.round(alt.confidence)}%)
							</button>
						{/each}
					</div>
				{/if}

				<div class="manual-override">
					<input
						type="text"
						bind:value={categoryName}
						placeholder="Or type your own category..."
						class="form-input"
					/>
				</div>
			</div>
		</Card>

		<div class="approach-section">
			<h3>What's your approach?</h3>
			<div class="approach-grid">
				{#each approaches as approach (approach.key)}
					<button
						class="approach-card"
						class:selected={selectedApproach === approach.key}
						onclick={() => selectedApproach = approach.key}
						type="button"
					>
						<span class="approach-icon">{approach.icon}</span>
						<span class="approach-label">{approach.label}</span>
						<span class="approach-desc">{approach.description}</span>
						<span class="approach-radio">
							{#if selectedApproach === approach.key}✓{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${projectId}/solve/triggers`)}>← Back</Button>
		<Button
			variant="primary"
			onclick={saveAndContinue}
			loading={saving}
			disabled={!canContinue}
		>
			Continue to Discovery →
		</Button>
	</div>
</div>

<style>
	.step-category h2 { margin-bottom: var(--space-1); }

	.step-description {
		color: var(--neutral-500);
		margin-bottom: var(--space-5);
	}

	.detection-prompt {
		text-align: center;
		padding: var(--space-6);
	}

	.detection-prompt p {
		margin-bottom: var(--space-4);
		color: var(--neutral-600);
	}

	.detection-header {
		margin-bottom: var(--space-3);
	}

	.detection-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--neutral-400);
	}

	.confidence-bar {
		width: 100%;
		height: 6px;
		background: var(--neutral-200);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: var(--space-2);
	}

	.confidence-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.5s ease;
	}

	.confidence-text {
		font-size: 0.8125rem;
		font-weight: 600;
		margin-bottom: var(--space-4);
		display: block;
	}

	.category-display {
		margin-bottom: var(--space-4);
	}

	.category-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--neutral-900);
	}

	.low-confidence-alert {
		padding: var(--space-3);
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		color: #92400e;
		margin-bottom: var(--space-4);
	}

	.alternatives {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-bottom: var(--space-4);
	}

	.alt-label {
		font-size: 0.8125rem;
		color: var(--neutral-500);
	}

	.alt-link {
		background: none;
		border: none;
		color: #4a96f8;
		text-decoration: underline;
		cursor: pointer;
		font-size: 0.8125rem;
		padding: 0;
	}

	.alt-link:hover { color: #2563eb; }

	.manual-override {
		margin-top: var(--space-3);
	}

	.form-input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}

	.form-input:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.approach-section {
		margin-top: var(--space-6);
	}

	.approach-section h3 {
		margin-bottom: var(--space-3);
	}

	.approach-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-3);
	}

	.approach-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--color-bg-secondary);
		border: 1.5px solid var(--neutral-200);
		border-radius: var(--radius-lg, 12px);
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: center;
		position: relative;
	}

	.approach-card:hover {
		border-color: var(--primary-300, #00cc96);
	}

	.approach-card.selected {
		border-color: #00cc96;
		background: rgba(0, 204, 150, 0.04);
	}

	.approach-icon { font-size: 1.5rem; }

	.approach-label {
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--neutral-800);
	}

	.approach-desc {
		font-size: 0.75rem;
		color: var(--neutral-500);
		line-height: 1.4;
	}

	.approach-radio {
		position: absolute;
		top: var(--space-2);
		right: var(--space-2);
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--neutral-300);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.625rem;
		font-weight: 700;
	}

	.approach-card.selected .approach-radio {
		border-color: #00cc96;
		background: #00cc96;
		color: white;
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-6);
		padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	@media (max-width: 640px) {
		.approach-grid { grid-template-columns: repeat(2, 1fr); }
	}
</style>
