<script lang="ts">
	import Button from '$components/ui/Button.svelte';

	interface VendorClaim {
		id: string;
		claim: string;
		category: 'pricing' | 'security' | 'feature' | 'timeline' | 'support' | 'compliance' | 'other';
		verified: 'yes' | 'no' | 'unk';
		verifiedDate: string | null;
		note: string;
	}

	let {
		claims = [],
		vendorName,
		onsave,
		onaiSuggest,
	}: {
		claims: VendorClaim[];
		vendorName: string;
		onsave: (claims: VendorClaim[]) => void;
		onaiSuggest?: () => void;
	} = $props();

	let localClaims = $state<VendorClaim[]>([...claims]);
	let newClaimText = $state('');
	let newClaimCategory = $state<VendorClaim['category']>('feature');

	const categories: { value: VendorClaim['category']; label: string; color: string }[] = [
		{ value: 'pricing', label: 'Pricing', color: '#00cc96' },
		{ value: 'security', label: 'Security', color: '#f05050' },
		{ value: 'feature', label: 'Feature', color: '#4a96f8' },
		{ value: 'timeline', label: 'Timeline', color: '#f0a034' },
		{ value: 'support', label: 'Support', color: '#a06cf0' },
		{ value: 'compliance', label: 'Compliance', color: '#00c8cc' },
		{ value: 'other', label: 'Other', color: '#888' },
	];

	const disputedCount = $derived(localClaims.filter((c) => c.verified === 'no').length);

	function addClaim() {
		if (!newClaimText.trim()) return;
		const claim: VendorClaim = {
			id: `cl_${Date.now()}`,
			claim: newClaimText.trim(),
			category: newClaimCategory,
			verified: 'unk',
			verifiedDate: null,
			note: '',
		};
		localClaims = [...localClaims, claim];
		newClaimText = '';
		onsave(localClaims);
	}

	function setVerified(index: number, status: 'yes' | 'no') {
		const claim = localClaims[index];
		if (claim.verified === status) {
			localClaims[index] = { ...claim, verified: 'unk', verifiedDate: null };
		} else {
			localClaims[index] = {
				...claim,
				verified: status,
				verifiedDate: status === 'yes' ? new Date().toLocaleDateString() : null,
			};
		}
		localClaims = [...localClaims];
		onsave(localClaims);
	}

	function removeClaim(index: number) {
		localClaims = localClaims.filter((_, i) => i !== index);
		onsave(localClaims);
	}

	function updateNote(index: number, note: string) {
		localClaims[index] = { ...localClaims[index], note };
		localClaims = [...localClaims];
	}

	function getCategoryColor(cat: VendorClaim['category']): string {
		return categories.find((c) => c.value === cat)?.color ?? '#888';
	}
</script>

<div class="claims-tracker">
	<div class="ct-header">
		<h3 class="ct-title">Claims Tracker</h3>
		<span class="ct-count">{localClaims.length} claim{localClaims.length !== 1 ? 's' : ''} logged</span>
	</div>

	{#if disputedCount > 0}
		<div class="ct-warning">
			⚠ {disputedCount} disputed claim{disputedCount !== 1 ? 's' : ''} — do not proceed to contract without resolution.
		</div>
	{/if}

	<div class="ct-input-row">
		<select bind:value={newClaimCategory} class="ct-category-select">
			{#each categories as cat}
				<option value={cat.value}>{cat.label}</option>
			{/each}
		</select>
		<input
			type="text"
			bind:value={newClaimText}
			placeholder="Log a vendor claim..."
			class="ct-input"
			onkeydown={(e) => e.key === 'Enter' && addClaim()}
		/>
		{#if onaiSuggest}
			<Button variant="ghost" size="sm" onclick={onaiSuggest}>✦ Suggest</Button>
		{/if}
		<Button variant="secondary" size="sm" onclick={addClaim}>+ Log</Button>
	</div>

	<div class="ct-list">
		{#each localClaims as claim, i (claim.id)}
			<div class="ct-row" class:verified={claim.verified === 'yes'} class:disputed={claim.verified === 'no'}>
				<span class="ct-cat-pill" style="background: {getCategoryColor(claim.category)}15; color: {getCategoryColor(claim.category)}">
					{claim.category}
				</span>
				<div class="ct-claim-body">
					<p class="ct-claim-text">{claim.claim}</p>
					{#if claim.note}
						<p class="ct-claim-note">{claim.note}</p>
					{/if}
					{#if claim.verifiedDate}
						<span class="ct-verified-date">Verified {claim.verifiedDate}</span>
					{/if}
				</div>
				<div class="ct-verify-btns">
					<button
						class="ct-verify-btn yes"
						class:active={claim.verified === 'yes'}
						onclick={() => setVerified(i, 'yes')}
						title="Verified"
					>✓</button>
					<button
						class="ct-verify-btn no"
						class:active={claim.verified === 'no'}
						onclick={() => setVerified(i, 'no')}
						title="Disputed"
					>✗</button>
				</div>
				<button class="ct-remove" onclick={() => removeClaim(i)} title="Remove">×</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.claims-tracker {
		display: flex; flex-direction: column; gap: var(--space-3);
	}

	.ct-header { display: flex; justify-content: space-between; align-items: center; }
	.ct-title { font-size: 0.9375rem; font-weight: 700; color: var(--neutral-800); margin: 0; }
	.ct-count { font-size: 0.75rem; color: var(--neutral-400); }

	.ct-warning {
		padding: var(--space-2) var(--space-3);
		background: rgba(240, 80, 80, 0.06);
		border: 1px solid rgba(240, 80, 80, 0.2);
		border-radius: var(--radius-md);
		font-size: 0.8125rem; color: #dc2626; font-weight: 500;
	}

	.ct-input-row {
		display: flex; gap: var(--space-2); align-items: center;
	}
	.ct-category-select {
		padding: 6px 10px; border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); font-size: 0.8125rem;
		background: white; color: var(--neutral-700);
	}
	.ct-input {
		flex: 1; padding: 6px 12px; border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md); font-size: 0.8125rem;
	}
	.ct-input:focus { outline: none; border-color: var(--primary-400); }

	.ct-list { display: flex; flex-direction: column; gap: var(--space-2); }
	.ct-row {
		display: flex; align-items: flex-start; gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-100);
		border-radius: var(--radius-md);
		transition: border-color 0.15s;
	}
	.ct-row.verified { border-color: rgba(0, 204, 150, 0.3); background: rgba(0, 204, 150, 0.02); }
	.ct-row.disputed { border-color: rgba(240, 80, 80, 0.3); background: rgba(240, 80, 80, 0.02); }

	.ct-cat-pill {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; padding: 2px 6px; border-radius: 6px;
		flex-shrink: 0; margin-top: 2px;
	}

	.ct-claim-body { flex: 1; min-width: 0; }
	.ct-claim-text { font-size: 0.875rem; color: var(--neutral-700); margin: 0; }
	.ct-claim-note { font-size: 0.75rem; color: var(--neutral-500); margin: 4px 0 0; font-style: italic; }
	.ct-verified-date { font-size: 0.625rem; color: #00cc96; font-weight: 600; }

	.ct-verify-btns { display: flex; gap: 4px; flex-shrink: 0; }
	.ct-verify-btn {
		width: 26px; height: 26px; border-radius: 50%;
		border: 1px solid var(--neutral-200); background: white;
		cursor: pointer; font-size: 0.75rem; font-weight: 700;
		display: flex; align-items: center; justify-content: center;
		transition: all 0.15s;
	}
	.ct-verify-btn.yes:hover, .ct-verify-btn.yes.active { background: rgba(0, 204, 150, 0.12); border-color: #00cc96; color: #00cc96; }
	.ct-verify-btn.no:hover, .ct-verify-btn.no.active { background: rgba(240, 80, 80, 0.12); border-color: #f05050; color: #f05050; }

	.ct-remove {
		width: 24px; height: 24px; border: none; background: none;
		cursor: pointer; color: var(--neutral-300); font-size: 1rem;
		display: flex; align-items: center; justify-content: center;
		border-radius: var(--radius-sm); transition: all 0.15s;
	}
	.ct-remove:hover { background: var(--neutral-100); color: var(--neutral-600); }

	@media (max-width: 640px) {
		.ct-input-row { flex-wrap: wrap; }
		.ct-input { min-width: 100%; }
	}
</style>
