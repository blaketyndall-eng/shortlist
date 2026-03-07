<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const projectId = $derived($page.params.id);
	const project = $derived(data.project);
	const state = $derived((project.state ?? {}) as Record<string, unknown>);
	const vendors = $derived(Array.isArray(state.vendors) ? state.vendors as Array<Record<string, unknown>> : []);
	const completion = $derived(state.completion as Record<string, unknown> | undefined);

	// Form state
	let selectedVendor = $state(completion?.selectedVendor as string ?? '');
	let rationale = $state(completion?.rationale as string ?? '');
	let actualCost = $state(completion?.actualCost as string ?? '');
	let surprises = $state(completion?.surprises as string ?? '');
	let timeline = $state(completion?.timeline as string ?? '');
	let saving = $state(false);
	let aiDebrief = $state<Record<string, unknown> | null>(completion?.aiDebrief as Record<string, unknown> ?? null);
	let completed = $state(project.status === 'completed');

	async function submitDebrief() {
		if (!selectedVendor || saving) return;
		saving = true;

		try {
			const res = await fetch(`/api/projects/${projectId}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					selectedVendor,
					rationale,
					actualCost: actualCost || null,
					surprises,
					timeline,
				}),
			});

			if (res.ok) {
				const result = await res.json();
				aiDebrief = result.aiDebrief;
				completed = true;
			}
		} catch {
			// Handle error
		} finally {
			saving = false;
		}
	}
</script>

<div class="complete-page">
	<div class="page-header">
		<h2>Complete Evaluation</h2>
		<p class="subtitle">Capture your decision and lessons learned for future evaluations.</p>
	</div>

	{#if completed && aiDebrief}
		<!-- AI Debrief Summary -->
		<div class="debrief-summary">
			<div class="debrief-header">
				<span class="ai-badge">✦ AI Debrief</span>
				<h3>Evaluation Lessons Learned</h3>
			</div>

			{#if aiDebrief.lessonsSummary}
				<p class="lessons-summary">{aiDebrief.lessonsSummary}</p>
			{/if}

			<div class="debrief-grid">
				{#if Array.isArray(aiDebrief.whatWorked) && aiDebrief.whatWorked.length > 0}
					<div class="debrief-section success">
						<h4>What Worked</h4>
						{#each aiDebrief.whatWorked as item}
							<div class="debrief-item">✓ {item}</div>
						{/each}
					</div>
				{/if}

				{#if Array.isArray(aiDebrief.whatDidnt) && aiDebrief.whatDidnt.length > 0}
					<div class="debrief-section warning">
						<h4>What Didn't</h4>
						{#each aiDebrief.whatDidnt as item}
							<div class="debrief-item">✗ {item}</div>
						{/each}
					</div>
				{/if}

				{#if Array.isArray(aiDebrief.surprises) && aiDebrief.surprises.length > 0}
					<div class="debrief-section info">
						<h4>Surprises</h4>
						{#each aiDebrief.surprises as item}
							<div class="debrief-item">! {item}</div>
						{/each}
					</div>
				{/if}

				{#if Array.isArray(aiDebrief.recommendationsForNext) && aiDebrief.recommendationsForNext.length > 0}
					<div class="debrief-section action">
						<h4>For Next Time</h4>
						{#each aiDebrief.recommendationsForNext as item}
							<div class="debrief-item">→ {item}</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="debrief-actions">
				<button class="btn-secondary" onclick={() => goto('/dashboard')}>
					Back to Dashboard
				</button>
				<button class="btn-primary" onclick={() => goto('/projects/new')}>
					Start Similar Project
				</button>
			</div>
		</div>
	{:else}
		<!-- Debrief Form -->
		<form class="debrief-form" onsubmit={(e) => { e.preventDefault(); submitDebrief(); }}>
			<div class="form-group">
				<label for="vendor">Which vendor did you select?</label>
				{#if vendors.length > 0}
					<select id="vendor" bind:value={selectedVendor}>
						<option value="">Choose vendor...</option>
						{#each vendors as v}
							<option value={v.name as string}>{v.name}</option>
						{/each}
						<option value="__none">No vendor selected (project abandoned)</option>
					</select>
				{:else}
					<input type="text" id="vendor" bind:value={selectedVendor} placeholder="Vendor name" />
				{/if}
			</div>

			<div class="form-group">
				<label for="rationale">Why this vendor? What tipped the decision?</label>
				<textarea id="rationale" bind:value={rationale} rows="3" placeholder="The key factors that drove this decision..."></textarea>
			</div>

			<div class="form-group">
				<label for="cost">Actual cost vs. what was quoted</label>
				<input type="text" id="cost" bind:value={actualCost} placeholder="e.g. Quoted $50k, negotiated to $38k/yr" />
			</div>

			<div class="form-group">
				<label for="timeline">How did the timeline compare to plan?</label>
				<input type="text" id="timeline" bind:value={timeline} placeholder="e.g. Took 6 weeks instead of planned 4" />
			</div>

			<div class="form-group">
				<label for="surprises">What surprised you during this evaluation?</label>
				<textarea id="surprises" bind:value={surprises} rows="3" placeholder="Unexpected findings, hidden costs, team disagreements..."></textarea>
			</div>

			<div class="form-actions">
				<button class="btn-secondary" type="button" onclick={() => goto(`/project/${projectId}/results`)}>
					Back to Results
				</button>
				<button class="btn-primary" type="submit" disabled={!selectedVendor || saving}>
					{saving ? 'Generating Debrief...' : 'Complete & Generate Debrief'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.complete-page {
		max-width: 720px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.page-header h2 {
		font-size: 1.375rem;
		font-weight: 700;
		margin-bottom: var(--space-1);
	}

	.subtitle {
		color: var(--neutral-500);
		font-size: 0.875rem;
	}

	/* Form */
	.debrief-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.form-group label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--neutral-700);
		margin-bottom: var(--space-2);
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md, 8px);
		font-size: 0.875rem;
		background: white;
		color: var(--neutral-800);
		transition: border-color var(--transition-fast);
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--primary-400);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.form-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
		padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	.btn-primary {
		padding: var(--space-2) var(--space-5);
		background: var(--primary-600, #4f46e5);
		color: white;
		border: none;
		border-radius: var(--radius-md, 8px);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-primary:hover:not(:disabled) { background: var(--primary-700, #4338ca); }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn-secondary {
		padding: var(--space-2) var(--space-5);
		background: white;
		color: var(--neutral-600);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md, 8px);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-secondary:hover { background: var(--neutral-50); }

	/* Debrief Summary */
	.debrief-summary {
		background: var(--neutral-50, #f8fafc);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-6);
	}

	.debrief-header {
		margin-bottom: var(--space-4);
	}

	.ai-badge {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--primary-600);
		background: rgba(99, 102, 241, 0.1);
		padding: 2px 8px;
		border-radius: 999px;
		margin-bottom: var(--space-2);
	}

	.debrief-header h3 {
		font-size: 1.125rem;
		font-weight: 700;
	}

	.lessons-summary {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--neutral-700);
		margin-bottom: var(--space-5);
		padding: var(--space-3) var(--space-4);
		background: white;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--neutral-100);
	}

	.debrief-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
	}

	.debrief-section {
		padding: var(--space-3) var(--space-4);
		background: white;
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--neutral-100);
	}

	.debrief-section h4 {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-2);
	}

	.debrief-section.success h4 { color: var(--success-600, #16a34a); }
	.debrief-section.warning h4 { color: var(--warning-600, #d97706); }
	.debrief-section.info h4 { color: var(--primary-600, #4f46e5); }
	.debrief-section.action h4 { color: var(--neutral-600); }

	.debrief-item {
		font-size: 0.8125rem;
		color: var(--neutral-600);
		padding: var(--space-1) 0;
		line-height: 1.4;
	}

	.debrief-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
	}
</style>
