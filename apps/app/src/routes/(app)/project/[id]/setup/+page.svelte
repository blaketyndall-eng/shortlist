<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import Button from '$components/ui/Button.svelte';
	import Card from '$components/ui/Card.svelte';
	import type { ProjectVendor } from '@shortlist/shared-types/project';

	let { data } = $props();

	const supabase = createSupabaseBrowserClient();
	let vendors: ProjectVendor[] = $state(data.vendors ?? []);
	let newVendorName = $state('');
	let newVendorWebsite = $state('');
	let saving = $state(false);
	let librarySearch = $state('');
	let libraryResults = $state<any[]>([]);
	let searching = $state(false);

	function addVendor() {
		if (!newVendorName.trim()) return;

		vendors = [
			...vendors,
			{
				id: crypto.randomUUID(),
				name: newVendorName.trim(),
				vendorProfileId: null,
				website: newVendorWebsite.trim() || null,
				notes: null,
				addedAt: new Date().toISOString()
			}
		];

		newVendorName = '';
		newVendorWebsite = '';
	}

	function removeVendor(id: string) {
		vendors = vendors.filter((v) => v.id !== id);
	}

	async function searchLibrary() {
		if (librarySearch.trim().length < 2) { libraryResults = []; return; }
		searching = true;
		try {
			const res = await fetch(`/api/vendors?q=${encodeURIComponent(librarySearch.trim())}&limit=5`);
			if (res.ok) {
				const data = await res.json();
				libraryResults = data.vendors ?? [];
			}
		} catch { /* ignore */ }
		searching = false;
	}

	function addFromLibrary(libVendor: any) {
		// Don't add duplicates
		if (vendors.some(v => v.name.toLowerCase() === libVendor.name.toLowerCase())) return;

		vendors = [
			...vendors,
			{
				id: crypto.randomUUID(),
				name: libVendor.name,
				vendorProfileId: libVendor.id,
				website: libVendor.website || null,
				notes: null,
				addedAt: new Date().toISOString()
			}
		];
		librarySearch = '';
		libraryResults = [];
	}

	async function saveAndContinue() {
		if (vendors.length < 2) return;

		saving = true;

		const newState = {
			...data.project.state,
			vendors
		};

		await supabase
			.from('projects')
			.update({
				state: newState,
				current_step: 'criteria',
				updated_at: new Date().toISOString()
			})
			.eq('id', data.project.id);

		goto(`/project/${data.project.id}/criteria`);
	}
</script>

<svelte:head>
	<title>Setup — {data.project.name} — Shortlist</title>
</svelte:head>

<div class="step-setup">
	<h2>Add vendors to evaluate</h2>
	<p class="step-description">
		Add at least 2 vendors you're considering. You can add more later.
	</p>

	<Card>
		<h3 class="library-title">Search vendor library</h3>
		<p class="library-hint">Find vendors from our library of 86+ verified profiles with AI intelligence.</p>
		<div class="library-search">
			<input
				type="text"
				bind:value={librarySearch}
				placeholder="Search vendors..."
				oninput={searchLibrary}
			/>
			{#if searching}
				<span class="search-spinner">Searching...</span>
			{/if}
		</div>
		{#if libraryResults.length > 0}
			<div class="library-results">
				{#each libraryResults as lib}
					<button class="lib-result" onclick={() => addFromLibrary(lib)}>
						<div class="lib-info">
							<span class="lib-name">{lib.name}</span>
							{#if lib.tagline}
								<span class="lib-tagline">{lib.tagline}</span>
							{/if}
						</div>
						<span class="lib-add">+ Add</span>
					</button>
				{/each}
			</div>
		{/if}
	</Card>

	<div class="divider-or">
		<span>or add manually</span>
	</div>

	<Card>
		<div class="vendor-form">
			<div class="vendor-inputs">
				<input
					type="text"
					bind:value={newVendorName}
					placeholder="Vendor name"
					onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addVendor())}
				/>
				<input
					type="url"
					bind:value={newVendorWebsite}
					placeholder="Website (optional)"
				/>
				<Button variant="secondary" size="sm" onclick={addVendor} disabled={!newVendorName.trim()}>
					Add
				</Button>
			</div>
		</div>

		{#if vendors.length > 0}
			<ul class="vendor-list">
				{#each vendors as vendor (vendor.id)}
					<li class="vendor-item">
						<div class="vendor-info">
							<span class="vendor-name">{vendor.name}</span>
							{#if vendor.website}
								<span class="vendor-url">{vendor.website}</span>
							{/if}
						</div>
						<button
							class="remove-btn"
							onclick={() => removeVendor(vendor.id)}
							aria-label="Remove {vendor.name}"
						>
							✕
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty-hint">No vendors added yet. Add at least 2 to continue.</p>
		{/if}
	</Card>

	<div class="step-actions">
		<Button variant="ghost" onclick={() => goto('/dashboard')}>Cancel</Button>
		<Button
			variant="primary"
			onclick={saveAndContinue}
			loading={saving}
			disabled={vendors.length < 2}
		>
			Continue to Criteria →
		</Button>
	</div>
</div>

<style>
	.step-setup h2 {
		margin-bottom: var(--space-1);
	}

	.step-description {
		color: var(--neutral-500);
		margin-bottom: var(--space-5);
	}

	.vendor-form {
		margin-bottom: var(--space-4);
	}

	.vendor-inputs {
		display: flex;
		gap: var(--space-2);
	}

	.vendor-inputs input {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}

	.vendor-inputs input:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.vendor-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.vendor-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--neutral-100);
	}

	.vendor-item:last-child {
		border-bottom: none;
	}

	.vendor-name {
		font-weight: 500;
		color: var(--neutral-800);
	}

	.vendor-url {
		font-size: 0.8125rem;
		color: var(--neutral-400);
		margin-left: var(--space-2);
	}

	.remove-btn {
		background: none;
		border: none;
		color: var(--neutral-400);
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
	}

	.remove-btn:hover {
		color: #dc2626;
		background: #fef2f2;
	}

	.empty-hint {
		text-align: center;
		color: var(--neutral-400);
		font-size: 0.875rem;
		padding: var(--space-4) 0;
	}

	.step-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}

	.library-title { font-size: 0.9375rem; font-weight: 600; margin-bottom: var(--space-1); }
	.library-hint { font-size: 0.8125rem; color: var(--neutral-400); margin-bottom: var(--space-3); }
	.library-search { position: relative; margin-bottom: var(--space-2); }
	.library-search input {
		width: 100%; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md);
		font-size: 0.9375rem;
	}
	.library-search input:focus { outline: var(--focus-ring); outline-offset: var(--focus-ring-offset); border-color: var(--primary-500); }
	.search-spinner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: var(--neutral-400); }
	.library-results { display: flex; flex-direction: column; gap: var(--space-1); }
	.lib-result {
		display: flex; justify-content: space-between; align-items: center;
		padding: var(--space-2) var(--space-3); background: rgba(255,255,255,0.03);
		border: 1px solid var(--neutral-200); border-radius: var(--radius-md);
		cursor: pointer; color: inherit; text-align: left; font-size: 0.875rem;
	}
	.lib-result:hover { background: rgba(74, 150, 248, 0.08); border-color: var(--primary-500); }
	.lib-name { font-weight: 500; display: block; }
	.lib-tagline { font-size: 0.75rem; color: var(--neutral-400); display: block; }
	.lib-add { color: var(--primary-600); font-weight: 600; font-size: 0.8125rem; flex-shrink: 0; }
	.divider-or {
		display: flex; align-items: center; gap: var(--space-3);
		margin: var(--space-4) 0; color: var(--neutral-400); font-size: 0.8125rem;
	}
	.divider-or::before, .divider-or::after {
		content: ''; flex: 1; height: 1px; background: var(--neutral-200);
	}
</style>
