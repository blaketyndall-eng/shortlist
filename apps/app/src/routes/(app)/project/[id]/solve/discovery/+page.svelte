<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;
	const solveData = data.project.solve_data ?? {};

	interface SwipeVendor {
		id: string;
		name: string;
		tagline: string;
		bestFor: string;
		tier: 'enterprise' | 'smb' | 'free';
		features: string[];
		risks: string[];
		whyFits: string;
		swiped: 'left' | 'right' | null;
	}

	let vendors = $state<SwipeVendor[]>(solveData.discoveredVendors ?? []);
	let currentIdx = $state(0);
	let loading = $state(false);
	let swiping = $state(false);
	let swipeDirection = $state<'left' | 'right' | null>(null);
	let saving = $state(false);
	let customVendorName = $state('');
	let allReviewed = $derived(vendors.length > 0 && vendors.every((v) => v.swiped !== null));
	let shortlisted = $derived(vendors.filter((v) => v.swiped === 'right'));

	// Find first un-swiped vendor
	$effect(() => {
		if (vendors.length > 0 && !allReviewed) {
			const nextIdx = vendors.findIndex((v) => v.swiped === null);
			if (nextIdx >= 0) currentIdx = nextIdx;
		}
	});

	const currentVendor = $derived(vendors[currentIdx] ?? null);
	const progress = $derived(vendors.filter((v) => v.swiped !== null).length);

	async function discoverVendors() {
		loading = true;
		try {
			const res = await fetch('/api/ai/discovery', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					category: solveData.categoryDetected ?? '',
					triggers: solveData.triggers?.filter((t: any) => t.selected).map((t: any) => t.label) ?? [],
					problemDescription: solveData.triggerQuestions?.[0]?.answer ?? '',
					companySize: solveData.triggerQuestions?.[6]?.answer ?? '',
				}),
			});

			if (res.ok) {
				const result = await res.json();
				vendors = (result.vendors ?? []).map((v: any, i: number) => ({
					id: v.id ?? crypto.randomUUID(),
					name: v.name ?? `Vendor ${i + 1}`,
					tagline: v.tagline ?? '',
					bestFor: v.bestFor ?? '',
					tier: v.tier ?? 'smb',
					features: v.features ?? [],
					risks: v.risks ?? [],
					whyFits: v.whyFits ?? '',
					swiped: null,
				}));
			}
		} catch {
			// Fallback demo data
			vendors = [
				{ id: '1', name: 'VendorA', tagline: 'Modern platform', bestFor: 'Growing teams', tier: 'smb', features: ['Easy setup', 'API access'], risks: [], whyFits: 'Matches your company size', swiped: null },
				{ id: '2', name: 'VendorB', tagline: 'Enterprise solution', bestFor: 'Large orgs', tier: 'enterprise', features: ['SSO', 'Custom workflows', 'Analytics'], risks: ['Complex onboarding'], whyFits: 'Strong feature set', swiped: null },
				{ id: '3', name: 'VendorC', tagline: 'Free tier available', bestFor: 'Startups', tier: 'free', features: ['Quick start', 'Free plan'], risks: ['Limited scale'], whyFits: 'Budget-friendly option', swiped: null },
			];
		}
		loading = false;
	}

	function swipe(direction: 'left' | 'right') {
		if (swiping || !currentVendor) return;
		swiping = true;
		swipeDirection = direction;

		setTimeout(() => {
			vendors = vendors.map((v, i) =>
				i === currentIdx ? { ...v, swiped: direction } : v
			);
			swipeDirection = null;
			swiping = false;
		}, 220);
	}

	function addCustomVendor() {
		if (!customVendorName.trim()) return;
		vendors = [
			...vendors,
			{
				id: crypto.randomUUID(),
				name: customVendorName.trim(),
				tagline: '',
				bestFor: '',
				tier: 'smb',
				features: [],
				risks: [],
				whyFits: 'Added manually',
				swiped: 'right',
			},
		];
		customVendorName = '';
	}

	function resetReview() {
		vendors = vendors.map((v) => ({ ...v, swiped: null }));
		currentIdx = 0;
	}

	function tierColor(tier: string): string {
		if (tier === 'enterprise') return 'rgba(160, 108, 240, 0.12)';
		if (tier === 'free') return 'rgba(0, 204, 150, 0.12)';
		return 'rgba(74, 150, 248, 0.12)';
	}

	function tierTextColor(tier: string): string {
		if (tier === 'enterprise') return '#7c3aed';
		if (tier === 'free') return '#00cc96';
		return '#4a96f8';
	}

	async function saveAndContinue() {
		saving = true;
		const newSolveData = {
			...solveData,
			discoveredVendors: vendors,
			shortlistedVendorIds: shortlisted.map((v) => v.id),
			completedSteps: [...new Set([...(solveData.completedSteps ?? []), 'triggers', 'category', 'vendor_discovery'])],
		};

		await supabase
			.from('projects')
			.update({
				solve_data: newSolveData,
				current_step: 'constraints',
				updated_at: new Date().toISOString(),
			})
			.eq('id', projectId);

		goto(`/project/${projectId}/solve/constraints`);
	}

	const canContinue = $derived(shortlisted.length >= 2);
</script>

<svelte:head>
	<title>Discovery — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-discovery">
	<h2>Vendor Discovery</h2>
	<p class="step-description">
		Swipe right to shortlist, left to skip. Select at least 2 vendors to evaluate.
	</p>

	{#if vendors.length === 0}
		<Card>
			<div class="discovery-prompt">
				<p>We'll find vendors that match your category and requirements.</p>
				<Button variant="primary" onclick={discoverVendors} loading={loading}>
					{loading ? 'Discovering...' : 'Discover Vendors'}
				</Button>
			</div>
		</Card>
	{:else if !allReviewed && currentVendor}
		<!-- Swiper card -->
		<div class="swiper-progress">
			<span>{progress + 1} of {vendors.length}</span>
			<div class="progress-dots">
				{#each vendors as v, i}
					<span
						class="dot"
						class:right={v.swiped === 'right'}
						class:left={v.swiped === 'left'}
						class:current={i === currentIdx}
					></span>
				{/each}
			</div>
		</div>

		<div class="swiper-container">
			<div
				class="vendor-card"
				class:swipe-left={swipeDirection === 'left'}
				class:swipe-right={swipeDirection === 'right'}
			>
				<div class="vendor-card-header">
					<span class="tier-badge" style="background: {tierColor(currentVendor.tier)}; color: {tierTextColor(currentVendor.tier)}">
						{currentVendor.tier}
					</span>
				</div>

				<h3 class="vendor-card-name">{currentVendor.name}</h3>
				{#if currentVendor.tagline}
					<p class="vendor-card-tagline">{currentVendor.tagline}</p>
				{/if}

				{#if currentVendor.bestFor}
					<div class="vendor-section">
						<span class="section-label">BEST FOR</span>
						<p>{currentVendor.bestFor}</p>
					</div>
				{/if}

				{#if currentVendor.features.length > 0}
					<div class="vendor-features">
						{#each currentVendor.features as feature}
							<div class="feature-row">✓ {feature}</div>
						{/each}
					</div>
				{/if}

				{#if currentVendor.risks.length > 0}
					<div class="vendor-risks">
						<span class="section-label">KNOWN RISKS</span>
						{#each currentVendor.risks as risk}
							<div class="risk-row">⚠ {risk}</div>
						{/each}
					</div>
				{/if}

				{#if currentVendor.whyFits}
					<div class="why-fits">
						<span class="section-label">WHY THIS FITS YOU</span>
						<p>{currentVendor.whyFits}</p>
					</div>
				{/if}
			</div>

			<div class="swipe-actions">
				<button class="swipe-btn skip" onclick={() => swipe('left')} disabled={swiping} type="button" aria-label="Skip vendor">
					✕
				</button>
				<button class="swipe-btn accept" onclick={() => swipe('right')} disabled={swiping} type="button" aria-label="Shortlist vendor">
					✓
				</button>
			</div>
		</div>
	{:else}
		<!-- All reviewed — show shortlist -->
		<Card>
			<div class="shortlist-complete">
				<h3>✓ Your shortlist is set</h3>
				<p>{shortlisted.length} vendor{shortlisted.length === 1 ? '' : 's'} selected</p>

				<div class="shortlist-grid">
					{#each shortlisted as vendor (vendor.id)}
						<div class="shortlist-item">
							<span class="vendor-avatar" style="background: {tierColor(vendor.tier)}; color: {tierTextColor(vendor.tier)}">
								{vendor.name.charAt(0)}
							</span>
							<span class="vendor-item-name">{vendor.name}</span>
						</div>
					{/each}
				</div>

				<div class="add-custom">
					<input
						type="text"
						bind:value={customVendorName}
						placeholder="Add a vendor not listed..."
						class="form-input"
						onkeydown={(e) => e.key === 'Enter' && addCustomVendor()}
					/>
					<Button variant="secondary" size="sm" onclick={addCustomVendor} disabled={!customVendorName.trim()}>
						Add
					</Button>
				</div>

				<button class="review-again" onclick={resetReview} type="button">
					Review cards again
				</button>
			</div>
		</Card>
	{/if}

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto(`/project/${projectId}/solve/category`)}>← Back</Button>
		<Button
			variant="primary"
			onclick={saveAndContinue}
			loading={saving}
			disabled={!canContinue}
		>
			Continue to Constraints →
		</Button>
	</div>
</div>

<style>
	.step-discovery h2 { margin-bottom: var(--space-1); }
	.step-description { color: var(--neutral-500); margin-bottom: var(--space-5); }

	.discovery-prompt { text-align: center; padding: var(--space-6); }
	.discovery-prompt p { margin-bottom: var(--space-4); color: var(--neutral-600); }

	.swiper-progress {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-3);
		font-size: 0.8125rem;
		color: var(--neutral-500);
	}

	.progress-dots { display: flex; gap: 4px; }

	.dot {
		width: 8px; height: 8px; border-radius: 50%;
		background: var(--neutral-200);
		transition: all 0.15s ease;
	}
	.dot.right { background: #00cc96; }
	.dot.left { background: var(--neutral-300); }
	.dot.current { background: #4a96f8; transform: scale(1.3); }

	.swiper-container { position: relative; }

	.vendor-card {
		background: white;
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-5);
		transition: transform 0.22s ease, opacity 0.22s ease;
	}
	.vendor-card.swipe-left { transform: translateX(-120%); opacity: 0; }
	.vendor-card.swipe-right { transform: translateX(120%); opacity: 0; }

	.vendor-card-header { margin-bottom: var(--space-3); }

	.tier-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 10px;
		border-radius: 999px;
	}

	.vendor-card-name { font-size: 1.375rem; font-weight: 700; margin-bottom: var(--space-1); }
	.vendor-card-tagline { color: var(--neutral-500); margin-bottom: var(--space-4); }

	.vendor-section { margin-bottom: var(--space-3); }
	.section-label {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.06em; color: var(--neutral-400); display: block;
		margin-bottom: var(--space-1);
	}
	.vendor-section p { font-size: 0.9375rem; color: var(--neutral-700); margin: 0; }

	.vendor-features { margin-bottom: var(--space-3); }
	.feature-row { font-size: 0.875rem; color: var(--neutral-700); padding: 2px 0; }

	.vendor-risks {
		background: rgba(239, 68, 68, 0.04);
		border: 1px solid rgba(239, 68, 68, 0.12);
		border-radius: var(--radius-md);
		padding: var(--space-3);
		margin-bottom: var(--space-3);
	}
	.risk-row { font-size: 0.875rem; color: #991b1b; padding: 2px 0; }

	.why-fits {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: var(--radius-md);
		padding: var(--space-3);
	}
	.why-fits p { font-size: 0.875rem; color: #065f46; margin: 0; }

	.swipe-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-6);
		margin-top: var(--space-4);
	}

	.swipe-btn {
		width: 56px; height: 56px; border-radius: 50%;
		border: 2px solid var(--neutral-200); background: white;
		font-size: 1.25rem; cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		transition: all 0.15s ease;
	}
	.swipe-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.swipe-btn.skip:hover { border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.04); }
	.swipe-btn.accept:hover { border-color: #00cc96; color: #00cc96; background: rgba(0, 204, 150, 0.04); }

	.shortlist-complete { text-align: center; padding: var(--space-4); }
	.shortlist-complete h3 { color: #00cc96; margin-bottom: var(--space-1); }
	.shortlist-complete > p { color: var(--neutral-500); margin-bottom: var(--space-4); }

	.shortlist-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: center;
		margin-bottom: var(--space-5);
	}

	.shortlist-item {
		display: flex; align-items: center; gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
	}

	.vendor-avatar {
		width: 28px; height: 28px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700;
	}

	.vendor-item-name { font-weight: 500; font-size: 0.9375rem; }

	.add-custom {
		display: flex; gap: var(--space-2);
		max-width: 400px; margin: 0 auto var(--space-4);
	}

	.form-input {
		flex: 1; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md); font-size: 0.9375rem;
	}
	.form-input:focus { outline: var(--focus-ring); border-color: var(--primary-500); }

	.review-again {
		background: none; border: none; color: #4a96f8;
		text-decoration: underline; cursor: pointer; font-size: 0.8125rem;
	}

	.step-actions {
		display: flex; justify-content: space-between;
		margin-top: var(--space-6); padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}
</style>
