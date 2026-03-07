<script lang="ts">
	import { page } from '$app/stores';
	import { userStore } from '$lib/stores/user.svelte';

	// Profile field options (matching prototype exactly)
	const INDUSTRIES = [
		'Technology', 'Healthcare', 'Financial Services', 'Manufacturing',
		'Retail', 'Education', 'Government', 'Non-profit',
		'Professional Services', 'Media', 'Energy', 'Real Estate', 'Other'
	];

	const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

	const BUDGETS = [
		'Under $10k', '$10k-$50k', '$50k-$100k',
		'$100k-$500k', '$500k-$1M', '$1M+'
	];

	const MATURITIES = ['Ad-hoc', 'Developing', 'Established', 'Optimised'];

	const COMPLIANCE_OPTIONS = [
		'SOC 2 Type II', 'ISO 27001', 'GDPR', 'HIPAA', 'FedRAMP',
		'PCI-DSS', 'CCPA', 'NIST 800-53', 'FINRA', 'None required'
	];

	const PRIORITY_OPTIONS = [
		'Cost reduction', 'Security first', 'Fast deployment', 'Ease of adoption',
		'Deep integrations', 'Vendor consolidation', 'Scalability',
		'Data sovereignty', 'Open-source preferred', 'Local support'
	];

	const VENDOR_PREF_OPTIONS = [
		'Enterprise tier', 'Mid-market', 'SMB-friendly',
		'Open-source', 'Best of breed', 'Suite/platform'
	];

	const PROCESS_OPTIONS = ['Individual', 'Committee', 'Formal RFP', 'Board approval'];

	const REGION_OPTIONS = [
		'North America', 'Europe', 'APAC', 'LATAM', 'Middle East', 'Africa', 'Global'
	];

	// Profile state
	let profile = $state({
		name: '',
		industry: '',
		size: '',
		budget: '',
		maturity: '',
		compliance: [] as string[],
		priorities: [] as string[],
		vendorPref: [] as string[],
		process: '',
		regions: [] as string[],
		stack: '',
		notes: ''
	});

	let aiDescription = $state('');
	let aiLoading = $state(false);
	let complianceLoading = $state(false);
	let prioritiesLoading = $state(false);
	let stackLoading = $state(false);
	let notesLoading = $state(false);
	let saving = $state(false);
	let saved = $state(false);
	let dirty = $state(false);

	// Load existing profile
	$effect(() => {
		loadProfile();
	});

	async function loadProfile() {
		try {
			const res = await fetch('/api/account/company-profile');
			if (res.ok) {
				const data = await res.json();
				if (data.profile) {
					profile = { ...profile, ...data.profile };
				}
			}
		} catch {
			// Will use defaults
		}
	}

	function markDirty() {
		dirty = true;
		saved = false;
	}

	async function saveProfile() {
		saving = true;
		try {
			await fetch('/api/account/company-profile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ profile })
			});
			saved = true;
			dirty = false;
		} catch {
			// Error handling
		} finally {
			saving = false;
		}
	}

	// AI: Auto-fill from description
	async function aiAutofill() {
		if (!aiDescription.trim()) return;
		aiLoading = true;
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'company_autofill',
					depth: 'quick',
					projectId: 'company-profile',
					context: { description: aiDescription }
				})
			});
			if (!res.ok) throw new Error('AI autofill failed');
			const data = await res.json();
			const r = data.result;
			if (r) {
				if (r.name) profile.name = r.name;
				if (r.industry) profile.industry = r.industry;
				if (r.size) profile.size = r.size;
				if (r.budget) profile.budget = r.budget;
				if (r.maturity) profile.maturity = r.maturity;
				if (r.process) profile.process = r.process;
				if (r.compliance) profile.compliance = r.compliance;
				if (r.priorities) profile.priorities = r.priorities;
				if (r.vendorPref) profile.vendorPref = r.vendorPref;
				if (r.regions) profile.regions = r.regions;
				if (r.stack) profile.stack = r.stack;
				if (r.notes) profile.notes = r.notes;
				dirty = true;
			}
		} catch {
			// Fallback
		} finally {
			aiLoading = false;
		}
	}

	// AI: Suggest compliance
	async function suggestCompliance() {
		complianceLoading = true;
		try {
			const desc = `${profile.name} - ${profile.industry}, ${profile.size} employees, ${profile.budget} budget`;
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'compliance_suggest',
					depth: 'quick',
					projectId: 'company-profile',
					context: { profileDesc: desc }
				})
			});
			if (!res.ok) throw new Error();
			const data = await res.json();
			if (Array.isArray(data.result)) {
				profile.compliance = data.result;
				dirty = true;
			}
		} catch { /* */ }
		finally { complianceLoading = false; }
	}

	// AI: Suggest priorities
	async function suggestPriorities() {
		prioritiesLoading = true;
		try {
			const desc = `${profile.name} - ${profile.industry}, ${profile.size} employees, maturity: ${profile.maturity}`;
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'priorities_suggest',
					depth: 'quick',
					projectId: 'company-profile',
					context: { profileDesc: desc }
				})
			});
			if (!res.ok) throw new Error();
			const data = await res.json();
			if (Array.isArray(data.result)) {
				profile.priorities = data.result;
				dirty = true;
			}
		} catch { /* */ }
		finally { prioritiesLoading = false; }
	}

	// AI: Suggest stack
	async function suggestStack() {
		stackLoading = true;
		try {
			const desc = `${profile.name} - ${profile.industry}, ${profile.size} employees`;
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'stack_suggest',
					depth: 'quick',
					projectId: 'company-profile',
					context: { profileDesc: desc, existingStack: profile.stack }
				})
			});
			if (!res.ok) throw new Error();
			const data = await res.json();
			const txt = typeof data.result === 'string' ? data.result : data.result?.text ?? '';
			if (txt) {
				profile.stack = txt;
				dirty = true;
			}
		} catch { /* */ }
		finally { stackLoading = false; }
	}

	// AI: Generate context notes
	async function generateNotes() {
		notesLoading = true;
		try {
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'context_notes',
					depth: 'quick',
					projectId: 'company-profile',
					context: { fullProfile: JSON.stringify(profile) }
				})
			});
			if (!res.ok) throw new Error();
			const data = await res.json();
			const txt = typeof data.result === 'string' ? data.result : data.result?.text ?? '';
			if (txt) {
				profile.notes = txt;
				dirty = true;
			}
		} catch { /* */ }
		finally { notesLoading = false; }
	}

	function toggleArrayItem(arr: string[], item: string): string[] {
		return arr.includes(item) ? arr.filter((a) => a !== item) : [...arr, item];
	}
</script>

<svelte:head>
	<title>Company Profile | Shortlist</title>
</svelte:head>

<div class="profile-page">
	<div class="profile-header">
		<div>
			<h1>Company Profile</h1>
			<p class="subtitle">Your profile context is automatically injected into all AI analyses for tailored recommendations.</p>
		</div>
		<div class="header-actions">
			{#if saved}
				<span class="saved-badge">✓ Saved</span>
			{/if}
			<button class="save-btn" disabled={!dirty || saving} onclick={saveProfile}>
				{saving ? 'Saving…' : 'Save Profile'}
			</button>
		</div>
	</div>

	<!-- AI Auto-fill Section -->
	<div class="ai-autofill">
		<div class="af-header">
			<span class="ai-badge">✦ AI Auto-fill</span>
			<span class="af-hint">Describe your company and we'll fill in the profile</span>
		</div>
		<div class="af-input-row">
			<textarea
				bind:value={aiDescription}
				placeholder="e.g. We're a 200-person healthcare SaaS company based in Austin. Series B, $15M ARR, SOC 2 certified. Looking to replace our legacy CRM with something that integrates with our EHR system…"
				rows="3"
			></textarea>
			<button class="af-btn" disabled={aiLoading || !aiDescription.trim()} onclick={aiAutofill}>
				{aiLoading ? 'Analyzing…' : '✦ Auto-fill'}
			</button>
		</div>
	</div>

	<div class="profile-grid">
		<!-- Basic Info -->
		<div class="field-group">
			<label>Company Name</label>
			<input type="text" bind:value={profile.name} oninput={markDirty} placeholder="Acme Corp" />
		</div>

		<div class="field-group">
			<label>Industry</label>
			<select bind:value={profile.industry} onchange={markDirty}>
				<option value="">Select…</option>
				{#each INDUSTRIES as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<div class="field-group">
			<label>Company Size</label>
			<select bind:value={profile.size} onchange={markDirty}>
				<option value="">Select…</option>
				{#each SIZES as opt}
					<option value={opt}>{opt} employees</option>
				{/each}
			</select>
		</div>

		<div class="field-group">
			<label>Annual Software Budget</label>
			<select bind:value={profile.budget} onchange={markDirty}>
				<option value="">Select…</option>
				{#each BUDGETS as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<div class="field-group">
			<label>Purchase Maturity</label>
			<select bind:value={profile.maturity} onchange={markDirty}>
				<option value="">Select…</option>
				{#each MATURITIES as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<div class="field-group">
			<label>Decision Process</label>
			<select bind:value={profile.process} onchange={markDirty}>
				<option value="">Select…</option>
				{#each PROCESS_OPTIONS as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Compliance -->
	<div class="multi-section">
		<div class="multi-header">
			<label>Compliance Requirements</label>
			<button class="ai-suggest-btn" disabled={complianceLoading} onclick={suggestCompliance}>
				{complianceLoading ? '…' : '✦ Suggest'}
			</button>
		</div>
		<div class="chip-grid">
			{#each COMPLIANCE_OPTIONS as opt}
				<button
					class="option-chip"
					class:active={profile.compliance.includes(opt)}
					onclick={() => { profile.compliance = toggleArrayItem(profile.compliance, opt); markDirty(); }}
				>{opt}</button>
			{/each}
		</div>
	</div>

	<!-- Priorities -->
	<div class="multi-section">
		<div class="multi-header">
			<label>Organizational Priorities</label>
			<button class="ai-suggest-btn" disabled={prioritiesLoading} onclick={suggestPriorities}>
				{prioritiesLoading ? '…' : '✦ Suggest'}
			</button>
		</div>
		<div class="chip-grid">
			{#each PRIORITY_OPTIONS as opt}
				<button
					class="option-chip"
					class:active={profile.priorities.includes(opt)}
					onclick={() => { profile.priorities = toggleArrayItem(profile.priorities, opt); markDirty(); }}
				>{opt}</button>
			{/each}
		</div>
	</div>

	<!-- Vendor Preferences -->
	<div class="multi-section">
		<div class="multi-header">
			<label>Vendor Tier Preference</label>
		</div>
		<div class="chip-grid">
			{#each VENDOR_PREF_OPTIONS as opt}
				<button
					class="option-chip"
					class:active={profile.vendorPref.includes(opt)}
					onclick={() => { profile.vendorPref = toggleArrayItem(profile.vendorPref, opt); markDirty(); }}
				>{opt}</button>
			{/each}
		</div>
	</div>

	<!-- Regions -->
	<div class="multi-section">
		<div class="multi-header">
			<label>Operating Regions</label>
		</div>
		<div class="chip-grid">
			{#each REGION_OPTIONS as opt}
				<button
					class="option-chip"
					class:active={profile.regions.includes(opt)}
					onclick={() => { profile.regions = toggleArrayItem(profile.regions, opt); markDirty(); }}
				>{opt}</button>
			{/each}
		</div>
	</div>

	<!-- Tech Stack -->
	<div class="multi-section">
		<div class="multi-header">
			<label>Existing Tech Stack</label>
			<button class="ai-suggest-btn" disabled={stackLoading} onclick={suggestStack}>
				{stackLoading ? '…' : '✦ Suggest'}
			</button>
		</div>
		<textarea
			bind:value={profile.stack}
			oninput={markDirty}
			placeholder="Salesforce, Slack, Jira, AWS, Snowflake, …"
			rows="2"
		></textarea>
	</div>

	<!-- Context Notes -->
	<div class="multi-section">
		<div class="multi-header">
			<label>AI Context Notes</label>
			<button class="ai-suggest-btn" disabled={notesLoading} onclick={generateNotes}>
				{notesLoading ? '…' : '✦ Generate'}
			</button>
		</div>
		<textarea
			bind:value={profile.notes}
			oninput={markDirty}
			placeholder="Additional context that should inform all AI recommendations…"
			rows="4"
		></textarea>
		<p class="notes-hint">These notes are injected into every AI prompt to tailor analysis to your organization.</p>
	</div>

	<div class="profile-footer">
		<button class="save-btn large" disabled={!dirty || saving} onclick={saveProfile}>
			{saving ? 'Saving…' : 'Save Company Profile'}
		</button>
	</div>
</div>

<style>
	.profile-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}
	.profile-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}
	.profile-header h1 {
		font-family: 'Playfair Display', serif;
		font-size: 1.8rem;
		color: var(--text, #e2e8f0);
		margin: 0;
	}
	.subtitle {
		font-size: 0.85rem;
		color: var(--text-muted, #94a3b8);
		margin: 0.3rem 0 0;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.saved-badge {
		color: var(--t, #00cc96);
		font-size: 0.8rem;
		font-weight: 500;
	}
	.save-btn {
		padding: 0.5rem 1.25rem;
		background: var(--t, #00cc96);
		color: #0b1017;
		border: none;
		border-radius: 8px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.save-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.save-btn.large {
		padding: 0.65rem 2rem;
		font-size: 0.85rem;
	}

	/* AI Auto-fill */
	.ai-autofill {
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 12px;
		padding: 1.25rem;
		margin-bottom: 2rem;
	}
	.af-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.ai-badge {
		background: rgba(0, 204, 150, 0.12);
		color: var(--t, #00cc96);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
	}
	.af-hint {
		font-size: 0.78rem;
		color: var(--text-muted, #94a3b8);
	}
	.af-input-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
	}
	.af-input-row textarea {
		flex: 1;
	}
	.af-btn {
		padding: 0.5rem 1rem;
		background: rgba(0, 204, 150, 0.12);
		border: 1px solid rgba(0, 204, 150, 0.25);
		border-radius: 8px;
		color: var(--t, #00cc96);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}
	.af-btn:hover {
		background: rgba(0, 204, 150, 0.2);
	}
	.af-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Form Grid */
	.profile-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		margin-bottom: 2rem;
	}
	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.field-group label, .multi-section label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted, #94a3b8);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	input, select, textarea {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 0.6rem 0.85rem;
		color: var(--text, #e2e8f0);
		font-size: 0.85rem;
		font-family: 'Figtree', sans-serif;
		transition: border-color 0.2s;
	}
	input:focus, select:focus, textarea:focus {
		outline: none;
		border-color: rgba(0, 204, 150, 0.4);
	}
	select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		padding-right: 2rem;
	}
	textarea {
		resize: vertical;
		min-height: 2.5rem;
	}

	/* Multi-select sections */
	.multi-section {
		margin-bottom: 1.5rem;
	}
	.multi-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.ai-suggest-btn {
		padding: 0.2rem 0.55rem;
		background: rgba(0, 204, 150, 0.08);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 4px;
		color: var(--t, #00cc96);
		font-size: 0.7rem;
		cursor: pointer;
	}
	.ai-suggest-btn:hover {
		background: rgba(0, 204, 150, 0.15);
	}
	.ai-suggest-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.option-chip {
		padding: 0.35rem 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		color: var(--text-muted, #94a3b8);
		font-size: 0.78rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.option-chip:hover {
		border-color: rgba(0, 204, 150, 0.25);
		color: var(--text, #e2e8f0);
	}
	.option-chip.active {
		background: rgba(0, 204, 150, 0.12);
		border-color: var(--t, #00cc96);
		color: var(--t, #00cc96);
		font-weight: 500;
	}
	.notes-hint {
		margin: 0.3rem 0 0;
		font-size: 0.7rem;
		color: var(--text-muted, #64748b);
		font-style: italic;
	}
	.profile-footer {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		justify-content: flex-end;
	}

	@media (max-width: 640px) {
		.profile-grid {
			grid-template-columns: 1fr;
		}
		.af-input-row {
			flex-direction: column;
		}
	}
</style>
