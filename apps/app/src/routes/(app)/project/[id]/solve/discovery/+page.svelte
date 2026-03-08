<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import VendorCompare from '$lib/components/vendor/VendorCompare.svelte';
	import AlignmentPoll from '$lib/components/alignment/AlignmentPoll.svelte';

	let { data } = $props();
	const supabase = createSupabaseBrowserClient();
	const projectId = data.project.id;
	const solveData = data.project.solve_data ?? {};

	interface SwipeVendor {
		id: string;
		name: string;
		tagline: string;
		bestFor: string;
		tier: 'enterprise' | 'smb' | 'free' | string;
		features: string[];
		risks: string[];
		whyFits: string;
		fitScore?: number;
		fitSignals?: string[];
		fitConcerns?: string[];
		swiped: 'left' | 'right' | null;
		slug?: string;
	}

	interface LibraryVendor {
		id: string;
		name: string;
		slug: string;
		tagline: string;
		category_id: string;
		tier: string;
		ai_overview?: string;
		ai_pricing?: string;
		best_for?: string;
		enrichment_status?: string;
		fitScore?: number;
		fitSignals?: string[];
	}

	let vendors = $state<SwipeVendor[]>(solveData.discoveredVendors ?? []);
	let currentIdx = $state(0);
	let loading = $state(false);
	let swiping = $state(false);
	let swipeDirection = $state<'left' | 'right' | null>(null);
	let saving = $state(false);
	let discoveryError = $state('');
	let customVendorName = $state('');
	let libraryCount = $state(0);

	// Fetch dynamic vendor library count
	$effect(() => {
		supabase.from('vendor_library').select('id', { count: 'exact', head: true }).then(({ count }) => {
			libraryCount = count ?? 0;
		});
	});
	let allReviewed = $derived(vendors.length > 0 && vendors.every((v) => v.swiped !== null));
	let shortlisted = $derived(vendors.filter((v) => v.swiped === 'right'));

	// Library explorer state
	let showLibrary = $state(false);
	let librarySearch = $state('');
	let libraryResults = $state<LibraryVendor[]>([]);
	let libraryLoading = $state(false);
	let fitScoresLoaded = $state(false);

	// Compare mode
	let showCompare = $state(false);
	let compareVendors = $state<any[]>([]);
	let compareLoading = $state(false);

	async function openCompare() {
		if (shortlisted.length < 2) return;
		compareLoading = true;
		showCompare = true;

		try {
			// Get vendor IDs from shortlisted that are in the library
			const libraryIds = shortlisted.filter((v) => v.slug).map((v) => v.id);

			if (libraryIds.length >= 2) {
				// Fetch full vendor data from library
				const { data: fullVendors } = await supabase
					.from('vendor_library')
					.select('*')
					.in('id', libraryIds);

				if (fullVendors && fullVendors.length >= 2) {
					// Merge fit scores into vendor data
					compareVendors = fullVendors.map((fv: any) => {
						const sv = shortlisted.find((s) => s.id === fv.id);
						return {
							...fv,
							fitScore: sv?.fitScore,
							fitSignals: sv?.fitSignals,
							fitConcerns: sv?.fitConcerns,
						};
					});
				} else {
					// Fallback: use shortlisted vendor data directly
					compareVendors = shortlisted.map((v) => ({
						id: v.id,
						name: v.name,
						slug: v.slug,
						tagline: v.tagline,
						tier: v.tier,
						best_for: v.bestFor,
						features: v.features,
						fitScore: v.fitScore,
						fitSignals: v.fitSignals,
						fitConcerns: v.fitConcerns,
					}));
				}
			} else {
				// Not enough library vendors — use what we have
				compareVendors = shortlisted.map((v) => ({
					id: v.id,
					name: v.name,
					slug: v.slug,
					tagline: v.tagline,
					tier: v.tier,
					best_for: v.bestFor,
					features: v.features,
					fitScore: v.fitScore,
					fitSignals: v.fitSignals,
					fitConcerns: v.fitConcerns,
				}));
			}
		} catch {
			compareVendors = shortlisted.map((v) => ({
				id: v.id,
				name: v.name,
				slug: v.slug,
				tagline: v.tagline,
				tier: v.tier,
				best_for: v.bestFor,
				features: v.features,
				fitScore: v.fitScore,
				fitSignals: v.fitSignals,
				fitConcerns: v.fitConcerns,
			}));
		}
		compareLoading = false;
	}

	function closeCompare() {
		showCompare = false;
		compareVendors = [];
	}

	function removeFromCompare(id: string) {
		compareVendors = compareVendors.filter((v: any) => v.id !== id);
		if (compareVendors.length < 2) {
			showCompare = false;
		}
	}

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
		discoveryError = '';
		try {
			// Step 1: Get AI-suggested vendors from engine
			const aiRes = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'vendor_suggest',
					depth: 'standard',
					projectId,
					context: {
						category: solveData.category?.label ?? solveData.categoryDetected ?? '',
						approach: solveData.approach ?? '',
						problem: solveData.triggerQuestions?.[0]?.answer ?? '',
						costOfInaction: solveData.triggerQuestions?.[3]?.answer ?? '',
						successKPI: solveData.triggerQuestions?.[4]?.answer ?? '',
						existingTool: solveData.triggerQuestions?.[5]?.answer ?? '',
						budget: solveData.budgetRange ?? '',
						teamSize: solveData.triggerQuestions?.[6]?.answer ?? '',
						whoAffected: solveData.triggerQuestions?.[1]?.answer ?? '',
					},
				}),
			});

			let aiVendors: any[] = [];
			if (aiRes.ok) {
				const result = await aiRes.json();
				aiVendors = Array.isArray(result.data) ? result.data : [];
			}

			// Step 2: Get fit scores for library vendors in this category
			const fitRes = await fetch('/api/vendors/fit-score', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					category: solveData.categoryDetected ?? '',
					limit: 10,
				}),
			});

			let fitScored: any[] = [];
			if (fitRes.ok) {
				const fitResult = await fitRes.json();
				fitScored = fitResult.scores ?? [];
				fitScoresLoaded = true;
			}

			// Step 3: Merge — prioritize fit-scored library vendors, fill gaps with AI
			const merged: SwipeVendor[] = [];
			const addedNames = new Set<string>();

			// Add fit-scored library vendors first (top 5)
			for (const fs of fitScored.slice(0, 5)) {
				if (!fs.vendor) continue;
				const v = fs.vendor;
				addedNames.add(v.name.toLowerCase());
				merged.push({
					id: v.id ?? crypto.randomUUID(),
					name: v.name,
					tagline: v.tagline ?? '',
					bestFor: v.best_for ?? '',
					tier: v.tier ?? 'smb',
					features: Array.isArray(v.features) ? v.features.slice(0, 4) : [],
					risks: fs.concerns?.slice(0, 2) ?? [],
					whyFits: fs.signals?.slice(0, 2).join('. ') || (v.best_for ? `Best for: ${v.best_for}` : `${v.tier ?? 'General'} vendor in ${solveData.category?.label ?? solveData.categoryDetected ?? 'this category'}`),
					fitScore: fs.totalScore,
					fitSignals: fs.signals,
					fitConcerns: fs.concerns,
					swiped: null,
					slug: v.slug,
				});
			}

			// Add AI suggestions that aren't duplicates
			for (const v of aiVendors) {
				if (addedNames.has(v.name?.toLowerCase())) continue;
				if (v.name?.toLowerCase().includes('status quo')) continue;
				addedNames.add(v.name?.toLowerCase());
				merged.push({
					id: crypto.randomUUID(),
					name: v.name ?? '',
					tagline: v.tagline ?? '',
					bestFor: v.bestFor ?? '',
					tier: v.tier ?? 'smb',
					features: v.features ?? [],
					risks: v.flags ?? [],
					whyFits: v.whyThisBuyer ?? '',
					swiped: null,
				});
			}

			vendors = merged.length > 0 ? merged : vendors;
			if (merged.length === 0) {
				discoveryError = 'No vendors found for this category. Try adjusting your problem description or category.';
			}
		} catch (err: any) {
			discoveryError = `Vendor discovery failed: ${err?.message ?? 'Network error'}. Please try again.`;
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

	// Library search
	async function searchLibrary() {
		if (!librarySearch.trim()) return;
		libraryLoading = true;
		try {
			const res = await fetch('/api/vendors/fit-score', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					limit: 15,
					projectContext: {
						problem: librarySearch,
						category: solveData.categoryDetected ?? '',
					},
				}),
			});

			if (res.ok) {
				const result = await res.json();
				libraryResults = (result.scores ?? []).map((s: any) => ({
					id: s.vendor?.id ?? '',
					name: s.vendorName,
					slug: s.vendor?.slug ?? '',
					tagline: s.vendor?.tagline ?? '',
					category_id: s.vendor?.category_id ?? '',
					tier: s.vendor?.tier ?? '',
					ai_overview: s.vendor?.ai_overview ?? '',
					ai_pricing: s.vendor?.ai_pricing ?? '',
					best_for: s.vendor?.best_for ?? '',
					enrichment_status: s.vendor?.enrichment_status ?? '',
					fitScore: s.totalScore,
					fitSignals: s.signals,
				}));
			}
		} catch {
			discoveryError = 'Library search failed — please try again.';
		}
		libraryLoading = false;
	}

	function addFromLibrary(libVendor: LibraryVendor) {
		if (vendors.some((v) => v.name.toLowerCase() === libVendor.name.toLowerCase())) return;
		vendors = [
			...vendors,
			{
				id: libVendor.id || crypto.randomUUID(),
				name: libVendor.name,
				tagline: libVendor.tagline,
				bestFor: libVendor.best_for ?? '',
				tier: libVendor.tier ?? 'smb',
				features: [],
				risks: [],
				whyFits: libVendor.fitSignals?.slice(0, 2).join('. ') ?? 'Added from library',
				fitScore: libVendor.fitScore,
				swiped: 'right', // Auto-shortlisted when added from library
				slug: libVendor.slug,
			},
		];
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

	function fitScoreColor(score: number): string {
		if (score >= 75) return '#00cc96';
		if (score >= 55) return '#d97706';
		return '#ef4444';
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
		AI-matched vendors ranked by fit for your problem, company, and budget. Swipe right to shortlist, left to skip.
	</p>

	{#if discoveryError}
		<div class="error-banner" role="alert">{discoveryError}</div>
	{/if}

	{#if vendors.length === 0}
		<Card>
			<div class="discovery-prompt">
				<p>We'll analyze your problem and company profile to find the best-fit vendors.</p>
				<Button variant="primary" onclick={discoverVendors} loading={loading}>
					{loading ? 'Finding best matches...' : 'Discover Vendors'}
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
					{#if currentVendor.fitScore}
						<span class="fit-badge" style="color: {fitScoreColor(currentVendor.fitScore)}">
							{currentVendor.fitScore}% fit
						</span>
					{/if}
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

				{#if currentVendor.fitSignals && currentVendor.fitSignals.length > 0}
					<div class="why-fits">
						<span class="section-label">WHY THIS FITS YOU</span>
						{#each currentVendor.fitSignals.slice(0, 3) as signal}
							<p>✓ {signal}</p>
						{/each}
					</div>
				{:else if currentVendor.whyFits}
					<div class="why-fits">
						<span class="section-label">WHY THIS FITS YOU</span>
						<p>{currentVendor.whyFits}</p>
					</div>
				{/if}

				{#if currentVendor.fitConcerns && currentVendor.fitConcerns.length > 0}
					<div class="vendor-risks">
						<span class="section-label">WATCH OUT FOR</span>
						{#each currentVendor.fitConcerns.slice(0, 2) as concern}
							<div class="risk-row">⚠ {concern}</div>
						{/each}
					</div>
				{:else if currentVendor.risks.length > 0}
					<div class="vendor-risks">
						<span class="section-label">KNOWN RISKS</span>
						{#each currentVendor.risks as risk}
							<div class="risk-row">⚠ {risk}</div>
						{/each}
					</div>
				{/if}

				{#if currentVendor.slug}
					<a href="/discover/{currentVendor.slug}" target="_blank" class="profile-link">
						View full profile →
					</a>
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
		<!-- All reviewed — show shortlist + library explorer -->
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
							{#if vendor.fitScore}
								<span class="fit-pill" style="color: {fitScoreColor(vendor.fitScore)}">{vendor.fitScore}%</span>
							{/if}
						</div>
					{/each}
				</div>

				{#if shortlisted.length >= 2 && !showCompare}
					<Button variant="secondary" onclick={openCompare} loading={compareLoading}>
						Compare {shortlisted.length} vendors side-by-side
					</Button>
				{/if}

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

	<!-- Compare View -->
	{#if showCompare && compareVendors.length >= 2}
		<div class="compare-section">
			<VendorCompare
				vendors={compareVendors}
				onRemove={removeFromCompare}
				onClose={closeCompare}
			/>
		</div>
	{/if}

	<!-- Explore Library Section (always visible after first discovery) -->
	{#if vendors.length > 0}
		<div class="library-explorer">
			<button class="toggle-library" onclick={() => showLibrary = !showLibrary} type="button">
				{showLibrary ? '▾' : '▸'} Explore vendor library ({libraryCount} vendors)
			</button>

			{#if showLibrary}
				<div class="library-content">
					<div class="library-search-row">
						<input
							type="text"
							bind:value={librarySearch}
							placeholder="Search by problem, vendor name, or category..."
							class="form-input library-input"
							onkeydown={(e) => e.key === 'Enter' && searchLibrary()}
						/>
						<Button variant="secondary" size="sm" onclick={searchLibrary} loading={libraryLoading}>
							Search
						</Button>
					</div>

					{#if libraryResults.length > 0}
						<div class="library-results">
							{#each libraryResults as lv}
								{@const alreadyAdded = vendors.some((v) => v.name.toLowerCase() === lv.name.toLowerCase())}
								<div class="library-row" class:added={alreadyAdded}>
									<div class="library-vendor-info">
										<div class="library-name-row">
											<span class="library-name">{lv.name}</span>
											{#if lv.fitScore}
												<span class="fit-pill" style="color: {fitScoreColor(lv.fitScore)}">{lv.fitScore}% fit</span>
											{/if}
											{#if lv.enrichment_status === 'enriched'}
												<span class="enriched-dot">AI</span>
											{/if}
										</div>
										{#if lv.tagline}
											<p class="library-tagline">{lv.tagline}</p>
										{/if}
										{#if lv.fitSignals && lv.fitSignals.length > 0}
											<p class="library-signal">{lv.fitSignals[0]}</p>
										{/if}
									</div>
									<div class="library-actions">
										{#if alreadyAdded}
											<span class="added-label">Added</span>
										{:else}
											<button class="add-lib-btn" onclick={() => addFromLibrary(lv)} type="button">
												+ Add
											</button>
										{/if}
										{#if lv.slug}
											<a href="/discover/{lv.slug}" target="_blank" class="view-link">View</a>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Team Alignment Poll -->
	{#if shortlisted.length > 0}
		<div class="alignment-section">
			<AlignmentPoll
				{projectId}
				stage="discovery"
				contextType="vendor_alignment"
				compact={true}
			/>
		</div>
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
	.error-banner {
		background: rgba(240, 80, 80, 0.1); color: #f05050;
		padding: var(--space-3); border-radius: var(--radius-md);
		margin-bottom: var(--space-4); font-size: 0.875rem;
	}

	.discovery-prompt { text-align: center; padding: var(--space-6); }
	.discovery-prompt p { margin-bottom: var(--space-4); color: var(--neutral-600); }

	.swiper-progress {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: var(--space-3); font-size: 0.8125rem; color: var(--neutral-500);
	}

	.progress-dots { display: flex; gap: 4px; }
	.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--neutral-200); transition: all 0.15s ease; }
	.dot.right { background: #00cc96; }
	.dot.left { background: var(--neutral-300); }
	.dot.current { background: #4a96f8; transform: scale(1.3); }

	.swiper-container { position: relative; }

	.vendor-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg, 12px);
		padding: var(--space-5);
		transition: transform 0.22s ease, opacity 0.22s ease;
	}
	.vendor-card.swipe-left { transform: translateX(-120%); opacity: 0; }
	.vendor-card.swipe-right { transform: translateX(120%); opacity: 0; }

	.vendor-card-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); }

	.tier-badge {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.05em; padding: 2px 10px; border-radius: 999px;
	}

	.fit-badge {
		font-size: 0.8125rem; font-weight: 800; margin-left: auto;
	}

	.fit-pill {
		font-size: 0.6875rem; font-weight: 700; margin-left: var(--space-1);
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
		background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.12);
		border-radius: var(--radius-md); padding: var(--space-3); margin-bottom: var(--space-3);
	}
	.risk-row { font-size: 0.875rem; color: #991b1b; padding: 2px 0; }

	.why-fits {
		background: rgba(0, 204, 150, 0.04); border: 1px solid rgba(0, 204, 150, 0.12);
		border-radius: var(--radius-md); padding: var(--space-3); margin-bottom: var(--space-3);
	}
	.why-fits p { font-size: 0.875rem; color: #065f46; margin: 2px 0; }

	.profile-link {
		display: block; text-align: right; font-size: 0.8125rem;
		color: var(--primary-600); text-decoration: none; margin-top: var(--space-2);
	}
	.profile-link:hover { text-decoration: underline; }

	.swipe-actions { display: flex; justify-content: center; gap: var(--space-6); margin-top: var(--space-4); }

	.swipe-btn {
		width: 56px; height: 56px; border-radius: 50%;
		border: 2px solid var(--neutral-200); background: var(--color-bg-secondary);
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

	.shortlist-grid { display: flex; flex-wrap: wrap; gap: var(--space-3); justify-content: center; margin-bottom: var(--space-5); }

	.shortlist-item {
		display: flex; align-items: center; gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
	}

	.vendor-avatar {
		width: 28px; height: 28px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.75rem; font-weight: 700;
	}

	.vendor-item-name { font-weight: 500; font-size: 0.9375rem; }

	.add-custom { display: flex; gap: var(--space-2); max-width: 400px; margin: 0 auto var(--space-4); }

	.form-input {
		flex: 1; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md); font-size: 0.9375rem;
		background: transparent; color: inherit;
	}
	.form-input:focus { outline: var(--focus-ring); border-color: var(--primary-500); }

	.review-again {
		background: none; border: none; color: #4a96f8;
		text-decoration: underline; cursor: pointer; font-size: 0.8125rem;
	}

	/* Alignment Section */
	.alignment-section {
		margin-top: var(--space-5);
	}

	/* Compare Section */
	.compare-section {
		margin-top: var(--space-5);
	}

	/* Library Explorer */
	.library-explorer {
		margin-top: var(--space-5);
		border-top: 1px solid var(--neutral-200);
		padding-top: var(--space-4);
	}

	.toggle-library {
		background: none; border: none; color: var(--primary-600);
		font-size: 0.9375rem; font-weight: 600; cursor: pointer;
		padding: var(--space-2) 0;
	}
	.toggle-library:hover { text-decoration: underline; }

	.library-content { margin-top: var(--space-3); }

	.library-search-row {
		display: flex; gap: var(--space-2); margin-bottom: var(--space-3);
	}
	.library-input { flex: 1; }

	.library-results { display: flex; flex-direction: column; gap: var(--space-2); }

	.library-row {
		display: flex; align-items: center; justify-content: space-between;
		padding: var(--space-3); background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
		transition: border-color 0.15s ease;
	}
	.library-row:hover { border-color: var(--primary-400); }
	.library-row.added { opacity: 0.6; }

	.library-vendor-info { flex: 1; min-width: 0; }
	.library-name-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
	.library-name { font-weight: 600; font-size: 0.9375rem; }
	.library-tagline { font-size: 0.8125rem; color: var(--neutral-500); margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.library-signal { font-size: 0.75rem; color: #00cc96; margin: 0; }

	.enriched-dot {
		font-size: 0.5625rem; font-weight: 800; padding: 1px 5px;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15));
		color: #7c3aed; border-radius: 999px;
	}

	.library-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }

	.add-lib-btn {
		padding: var(--space-1) var(--space-3); font-size: 0.8125rem;
		font-weight: 600; border: 1px solid #00cc96; color: #00cc96;
		background: rgba(0, 204, 150, 0.06); border-radius: var(--radius-md);
		cursor: pointer; transition: all 0.15s ease;
	}
	.add-lib-btn:hover { background: rgba(0, 204, 150, 0.12); }

	.added-label { font-size: 0.75rem; color: var(--neutral-400); font-weight: 500; }

	.view-link {
		font-size: 0.75rem; color: var(--primary-600); text-decoration: none;
	}
	.view-link:hover { text-decoration: underline; }

	.step-actions {
		display: flex; justify-content: space-between;
		margin-top: var(--space-6); padding-top: var(--space-4);
		border-top: 1px solid var(--neutral-100);
	}

	@media (max-width: 640px) {
		.library-row { flex-direction: column; align-items: flex-start; gap: var(--space-2); }
		.library-actions { width: 100%; justify-content: flex-end; }
	}
</style>
