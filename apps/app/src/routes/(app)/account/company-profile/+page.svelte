<script lang="ts">
	import { page } from '$app/stores';
	import { userStore } from '$lib/stores/user.svelte';

	// Profile field options
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

	const TIMELINE_OPTIONS = [
		'Under 2 weeks', '2-4 weeks', '1-3 months', '3-6 months', '6-12 months', '12+ months'
	];

	const DEAL_BREAKER_OPTIONS = [
		'No SSO support', 'No on-prem option', 'Vendor lock-in', 'No API access',
		'Poor mobile experience', 'No audit logging', 'Limited customization',
		'No SLA guarantees', 'Data residency issues', 'No offline mode'
	];

	const INTEGRATION_OPTIONS = [
		'SSO/SAML', 'REST API', 'Webhooks', 'Native Salesforce', 'Native Slack',
		'Native Microsoft 365', 'Native Google Workspace', 'SCIM provisioning',
		'Data warehouse sync', 'Custom ETL', 'iPaaS (Zapier/Make/Workato)'
	];

	// Profile state — all fields
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
		notes: '',
		// New fields
		typicalTimeline: '',
		stakeholders: '',
		dealBreakers: [] as string[],
		integrationReqs: [] as string[],
		pastVendorLessons: '',
		approvalWorkflow: '',
		painPoints: '',
		successMetrics: '',
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

	// AI Interview Assistant state
	let assistantOpen = $state(false);
	let assistantMessages = $state<Array<{role: 'assistant' | 'user', text: string}>>([]);
	let assistantInput = $state('');
	let assistantLoading = $state(false);
	let assistantStep = $state(0);

	// Completeness scoring
	const FIELD_WEIGHTS: Record<string, { weight: number; label: string; section: string }> = {
		name:              { weight: 10, label: 'Company Name', section: 'basics' },
		industry:          { weight: 8,  label: 'Industry', section: 'basics' },
		size:              { weight: 8,  label: 'Company Size', section: 'basics' },
		budget:            { weight: 7,  label: 'Software Budget', section: 'basics' },
		maturity:          { weight: 5,  label: 'Purchase Maturity', section: 'basics' },
		process:           { weight: 6,  label: 'Decision Process', section: 'basics' },
		compliance:        { weight: 6,  label: 'Compliance', section: 'governance' },
		priorities:        { weight: 7,  label: 'Priorities', section: 'governance' },
		vendorPref:        { weight: 4,  label: 'Vendor Preference', section: 'governance' },
		regions:           { weight: 5,  label: 'Regions', section: 'governance' },
		stack:             { weight: 6,  label: 'Tech Stack', section: 'technical' },
		integrationReqs:   { weight: 6,  label: 'Integration Reqs', section: 'technical' },
		dealBreakers:      { weight: 5,  label: 'Deal-breakers', section: 'technical' },
		typicalTimeline:   { weight: 4,  label: 'Typical Timeline', section: 'process' },
		stakeholders:      { weight: 5,  label: 'Stakeholders', section: 'process' },
		approvalWorkflow:  { weight: 4,  label: 'Approval Workflow', section: 'process' },
		painPoints:        { weight: 5,  label: 'Pain Points', section: 'intelligence' },
		successMetrics:    { weight: 4,  label: 'Success Metrics', section: 'intelligence' },
		pastVendorLessons: { weight: 4,  label: 'Past Lessons', section: 'intelligence' },
		notes:             { weight: 3,  label: 'AI Notes', section: 'intelligence' },
	};

	let completeness = $derived(() => {
		const totalWeight = Object.values(FIELD_WEIGHTS).reduce((s, f) => s + f.weight, 0);
		let earned = 0;
		for (const [key, meta] of Object.entries(FIELD_WEIGHTS)) {
			const val = (profile as Record<string, unknown>)[key];
			if (Array.isArray(val) && val.length > 0) earned += meta.weight;
			else if (typeof val === 'string' && val.trim()) earned += meta.weight;
		}
		return Math.round((earned / totalWeight) * 100);
	});

	let missingFields = $derived(() => {
		const missing: Array<{ label: string; section: string; weight: number }> = [];
		for (const [key, meta] of Object.entries(FIELD_WEIGHTS)) {
			const val = (profile as Record<string, unknown>)[key];
			const filled = Array.isArray(val) ? val.length > 0 : typeof val === 'string' && val.trim() !== '';
			if (!filled) missing.push(meta);
		}
		return missing.sort((a, b) => b.weight - a.weight);
	});

	let completenessColor = $derived(() => {
		const pct = completeness();
		if (pct >= 80) return '#00cc96';
		if (pct >= 50) return '#f0b429';
		return '#ef4444';
	});

	let completenessLabel = $derived(() => {
		const pct = completeness();
		if (pct >= 80) return 'Excellent — AI context is rich';
		if (pct >= 50) return 'Good start — fill more for better AI';
		if (pct >= 25) return 'Basic — AI recommendations limited';
		return 'Empty — AI has no company context';
	});

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
			const r = data.result ?? data.data;
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
				if (r.typicalTimeline) profile.typicalTimeline = r.typicalTimeline;
				if (r.stakeholders) profile.stakeholders = r.stakeholders;
				if (r.dealBreakers) profile.dealBreakers = r.dealBreakers;
				if (r.integrationReqs) profile.integrationReqs = r.integrationReqs;
				if (r.painPoints) profile.painPoints = r.painPoints;
				if (r.successMetrics) profile.successMetrics = r.successMetrics;
				if (r.pastVendorLessons) profile.pastVendorLessons = r.pastVendorLessons;
				if (r.approvalWorkflow) profile.approvalWorkflow = r.approvalWorkflow;
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
			const desc = `${profile.name} - ${profile.industry}, ${profile.size} employees, ${profile.budget} budget, regions: ${profile.regions.join(', ')}`;
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
			const desc = `${profile.name} - ${profile.industry}, ${profile.size} employees, maturity: ${profile.maturity}, pain points: ${profile.painPoints}`;
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

	// ==========================================================
	// AI Profile Interview Assistant
	// ==========================================================

	const INTERVIEW_QUESTIONS = [
		{
			question: "Let's start with the basics — what's your company name, and what industry are you in? How many people work there?",
			fields: ['name', 'industry', 'size'],
			extract: 'basics'
		},
		{
			question: "What's your typical annual software budget, and how mature is your purchase process today? (Ad-hoc, developing, established, or optimised?)",
			fields: ['budget', 'maturity'],
			extract: 'budget_maturity'
		},
		{
			question: "When your team evaluates new software, what's the approval process? Who are the key stakeholders involved in the decision?",
			fields: ['process', 'stakeholders', 'approvalWorkflow'],
			extract: 'governance'
		},
		{
			question: "What tools make up your current tech stack? Think CRM, HRIS, project management, cloud, communication — the big ones.",
			fields: ['stack'],
			extract: 'stack'
		},
		{
			question: "What integration capabilities are must-haves? For example — SSO, API access, Salesforce native, Slack integration, data warehouse sync?",
			fields: ['integrationReqs'],
			extract: 'integrations'
		},
		{
			question: "What compliance or regulatory frameworks does your organisation need vendors to meet?",
			fields: ['compliance', 'regions'],
			extract: 'compliance'
		},
		{
			question: "What are the biggest pain points or frustrations with your current software purchasing process? Any lessons from past vendor experiences?",
			fields: ['painPoints', 'pastVendorLessons'],
			extract: 'pain_lessons'
		},
		{
			question: "Finally — what are your absolute deal-breakers when evaluating a vendor? And what does a successful software purchase look like to you?",
			fields: ['dealBreakers', 'successMetrics', 'priorities'],
			extract: 'dealbreakers_success'
		}
	];

	function startAssistant() {
		assistantOpen = true;
		assistantStep = 0;
		assistantMessages = [
			{ role: 'assistant', text: "I'm your AI Profile Assistant. I'll ask a few questions to build out your company profile — this context helps every AI recommendation across Shortlist become more relevant and accurate." },
			{ role: 'assistant', text: INTERVIEW_QUESTIONS[0].question }
		];
	}

	async function sendAssistantMessage() {
		if (!assistantInput.trim() || assistantLoading) return;

		const userMsg = assistantInput.trim();
		assistantInput = '';
		assistantMessages = [...assistantMessages, { role: 'user', text: userMsg }];
		assistantLoading = true;

		try {
			// Send to AI to extract structured data from the answer
			const currentQ = INTERVIEW_QUESTIONS[assistantStep];
			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'profile_interview',
					depth: 'quick',
					projectId: 'company-profile',
					context: {
						questionAsked: currentQ.question,
						userAnswer: userMsg,
						extractType: currentQ.extract,
						currentProfile: JSON.stringify(profile)
					}
				})
			});

			if (res.ok) {
				const data = await res.json();
				const r = data.result ?? data.data;
				if (r) {
					// Apply extracted fields to profile
					for (const key of currentQ.fields) {
						if (r[key] !== undefined && r[key] !== null && r[key] !== '') {
							(profile as Record<string, unknown>)[key] = r[key];
						}
					}
					dirty = true;

					// Show confirmation
					const filledCount = currentQ.fields.filter(f => {
						const v = r[f];
						return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
					}).length;

					if (filledCount > 0) {
						assistantMessages = [...assistantMessages, {
							role: 'assistant',
							text: `Got it — updated ${filledCount} field${filledCount > 1 ? 's' : ''} from your answer.`
						}];
					}
				}
			}

			// Move to next question or finish
			assistantStep++;
			if (assistantStep < INTERVIEW_QUESTIONS.length) {
				assistantMessages = [...assistantMessages, {
					role: 'assistant',
					text: INTERVIEW_QUESTIONS[assistantStep].question
				}];
			} else {
				assistantMessages = [...assistantMessages, {
					role: 'assistant',
					text: `Your profile is looking great — completeness is now at ${completeness()}%. I've filled in what I could from our conversation. Feel free to review and tweak anything below, then hit Save.`
				}];
			}
		} catch {
			assistantMessages = [...assistantMessages, {
				role: 'assistant',
				text: "I had trouble processing that. Could you try rephrasing?"
			}];
		} finally {
			assistantLoading = false;
		}
	}

	function closeAssistant() {
		assistantOpen = false;
	}
</script>

<svelte:head>
	<title>Company Profile | Shortlist</title>
</svelte:head>

<div class="profile-page">
	<div class="profile-header">
		<div>
			<h1>Company Profile</h1>
			<p class="subtitle">This profile powers every AI recommendation across the SOLVE workflow — the more context you give, the smarter your results.</p>
		</div>
		<div class="header-actions">
			{#if saved}
				<span class="saved-badge">&#10003; Saved</span>
			{/if}
			<button class="save-btn" disabled={!dirty || saving} onclick={saveProfile}>
				{saving ? 'Saving…' : 'Save Profile'}
			</button>
		</div>
	</div>

	<!-- Completeness Score -->
	<div class="completeness-bar">
		<div class="completeness-top">
			<div class="completeness-label">
				<span class="completeness-pct" style="color: {completenessColor()}">{completeness()}%</span>
				<span class="completeness-text">{completenessLabel()}</span>
			</div>
			{#if missingFields().length > 0 && missingFields().length <= 6}
				<span class="completeness-missing">Missing: {missingFields().slice(0, 4).map(f => f.label).join(', ')}{missingFields().length > 4 ? ` +${missingFields().length - 4} more` : ''}</span>
			{/if}
		</div>
		<div class="completeness-track">
			<div class="completeness-fill" style="width: {completeness()}%; background: {completenessColor()}"></div>
		</div>
	</div>

	<!-- AI Assistant + Auto-fill -->
	<div class="ai-section">
		<div class="ai-row">
			<div class="ai-autofill">
				<div class="af-header">
					<span class="ai-badge">✦ Quick Fill</span>
					<span class="af-hint">Paste a company description to auto-fill fields</span>
				</div>
				<div class="af-input-row">
					<textarea
						bind:value={aiDescription}
						placeholder="e.g. We're a 200-person healthcare SaaS company based in Austin. Series B, $15M ARR, SOC 2 certified…"
						rows="2"
					></textarea>
					<button class="af-btn" disabled={aiLoading || !aiDescription.trim()} onclick={aiAutofill}>
						{aiLoading ? 'Analyzing…' : '✦ Auto-fill'}
					</button>
				</div>
			</div>

			<button class="assistant-trigger" onclick={startAssistant}>
				<span class="assistant-icon">✦</span>
				<div>
					<span class="assistant-title">AI Profile Assistant</span>
					<span class="assistant-desc">Guided interview to build your profile</span>
				</div>
			</button>
		</div>
	</div>

	<!-- AI Interview Assistant Panel -->
	{#if assistantOpen}
		<div class="assistant-panel">
			<div class="assistant-header">
				<div class="assistant-header-left">
					<span class="ai-badge">✦ Profile Assistant</span>
					<span class="assistant-progress">Step {Math.min(assistantStep + 1, INTERVIEW_QUESTIONS.length)} of {INTERVIEW_QUESTIONS.length}</span>
				</div>
				<button class="assistant-close" onclick={closeAssistant}>✕</button>
			</div>
			<div class="assistant-messages">
				{#each assistantMessages as msg}
					<div class="msg" class:msg-user={msg.role === 'user'} class:msg-ai={msg.role === 'assistant'}>
						{#if msg.role === 'assistant'}<span class="msg-avatar">✦</span>{/if}
						<span class="msg-text">{msg.text}</span>
					</div>
				{/each}
				{#if assistantLoading}
					<div class="msg msg-ai">
						<span class="msg-avatar">✦</span>
						<span class="msg-text typing">Thinking…</span>
					</div>
				{/if}
			</div>
			{#if assistantStep < INTERVIEW_QUESTIONS.length}
				<div class="assistant-input-row">
					<input
						type="text"
						bind:value={assistantInput}
						placeholder="Type your answer…"
						onkeydown={(e) => { if (e.key === 'Enter') sendAssistantMessage(); }}
					/>
					<button class="af-btn" disabled={assistantLoading || !assistantInput.trim()} onclick={sendAssistantMessage}>
						Send
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- SECTION: Company Basics -->
	<div class="section-divider">
		<span class="section-label">Company Basics</span>
	</div>

	<div class="profile-grid">
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
			<label>Operating Regions</label>
			<div class="chip-grid compact">
				{#each REGION_OPTIONS as opt}
					<button
						class="option-chip"
						class:active={profile.regions.includes(opt)}
						onclick={() => { profile.regions = toggleArrayItem(profile.regions, opt); markDirty(); }}
					>{opt}</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- SECTION: Procurement & Governance -->
	<div class="section-divider">
		<span class="section-label">Procurement &amp; Governance</span>
	</div>

	<div class="profile-grid">
		<div class="field-group">
			<label>Decision Process</label>
			<select bind:value={profile.process} onchange={markDirty}>
				<option value="">Select…</option>
				{#each PROCESS_OPTIONS as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>

		<div class="field-group">
			<label>Typical Evaluation Timeline</label>
			<select bind:value={profile.typicalTimeline} onchange={markDirty}>
				<option value="">Select…</option>
				{#each TIMELINE_OPTIONS as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="multi-section">
		<div class="multi-header">
			<label>Key Stakeholders</label>
		</div>
		<textarea
			bind:value={profile.stakeholders}
			oninput={markDirty}
			placeholder="e.g. VP of IT (final sign-off), Head of Procurement (vendor vetting), Department Heads (requirements)…"
			rows="2"
		></textarea>
		<p class="field-hint">Who's typically involved in software purchase decisions and what are their roles?</p>
	</div>

	<div class="multi-section">
		<div class="multi-header">
			<label>Approval Workflow</label>
		</div>
		<textarea
			bind:value={profile.approvalWorkflow}
			oninput={markDirty}
			placeholder="e.g. Team lead request → Procurement review → Security assessment → VP sign-off → Legal contract review…"
			rows="2"
		></textarea>
		<p class="field-hint">Describe the typical steps from initial request to signed contract.</p>
	</div>

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

	<!-- SECTION: Technical Requirements -->
	<div class="section-divider">
		<span class="section-label">Technical Requirements</span>
	</div>

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

	<div class="multi-section">
		<div class="multi-header">
			<label>Integration Requirements</label>
		</div>
		<div class="chip-grid">
			{#each INTEGRATION_OPTIONS as opt}
				<button
					class="option-chip"
					class:active={profile.integrationReqs.includes(opt)}
					onclick={() => { profile.integrationReqs = toggleArrayItem(profile.integrationReqs, opt); markDirty(); }}
				>{opt}</button>
			{/each}
		</div>
	</div>

	<div class="multi-section">
		<div class="multi-header">
			<label>Deal-breakers</label>
		</div>
		<p class="field-hint" style="margin-top: 0; margin-bottom: 0.5rem;">What would immediately disqualify a vendor from consideration?</p>
		<div class="chip-grid">
			{#each DEAL_BREAKER_OPTIONS as opt}
				<button
					class="option-chip dealbreaker"
					class:active={profile.dealBreakers.includes(opt)}
					onclick={() => { profile.dealBreakers = toggleArrayItem(profile.dealBreakers, opt); markDirty(); }}
				>{opt}</button>
			{/each}
		</div>
	</div>

	<!-- SECTION: Purchase Intelligence -->
	<div class="section-divider">
		<span class="section-label">Purchase Intelligence</span>
	</div>

	<div class="multi-section">
		<div class="multi-header">
			<label>Key Pain Points</label>
		</div>
		<textarea
			bind:value={profile.painPoints}
			oninput={markDirty}
			placeholder="e.g. Current tools don't talk to each other, onboarding new vendors takes 6 months, no visibility into contract renewals…"
			rows="3"
		></textarea>
		<p class="field-hint">What frustrations or inefficiencies do you most want to solve?</p>
	</div>

	<div class="multi-section">
		<div class="multi-header">
			<label>Success Metrics</label>
		</div>
		<textarea
			bind:value={profile.successMetrics}
			oninput={markDirty}
			placeholder="e.g. Reduce time-to-decision by 40%, improve team adoption rates above 80%, cut per-seat cost by 20%…"
			rows="2"
		></textarea>
		<p class="field-hint">How do you measure whether a software purchase was successful?</p>
	</div>

	<div class="multi-section">
		<div class="multi-header">
			<label>Past Vendor Lessons</label>
		</div>
		<textarea
			bind:value={profile.pastVendorLessons}
			oninput={markDirty}
			placeholder="e.g. Chose a vendor based on demo alone — implementation was a nightmare. Now we always run a POC with real data first…"
			rows="3"
		></textarea>
		<p class="field-hint">What have past purchases taught you? This helps AI flag similar risks early.</p>
	</div>

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
		<p class="field-hint">These notes are injected into every AI prompt to tailor analysis to your organization.</p>
	</div>

	<div class="profile-footer">
		<div class="footer-left">
			<span class="completeness-pct-small" style="color: {completenessColor()}">{completeness()}% complete</span>
		</div>
		<button class="save-btn large" disabled={!dirty || saving} onclick={saveProfile}>
			{saving ? 'Saving…' : 'Save Company Profile'}
		</button>
	</div>
</div>

<style>
	.profile-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1.5rem 3rem;
	}
	.profile-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.25rem;
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
		max-width: 500px;
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
	.save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.save-btn.large { padding: 0.65rem 2rem; font-size: 0.85rem; }

	/* Completeness Bar */
	.completeness-bar {
		margin-bottom: 1.5rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 10px;
	}
	.completeness-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.completeness-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.completeness-pct {
		font-size: 1.1rem;
		font-weight: 700;
		font-family: 'Figtree', sans-serif;
	}
	.completeness-text {
		font-size: 0.78rem;
		color: var(--text-muted, #94a3b8);
	}
	.completeness-missing {
		font-size: 0.7rem;
		color: var(--text-muted, #64748b);
	}
	.completeness-track {
		height: 4px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 2px;
		overflow: hidden;
	}
	.completeness-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.4s ease, background 0.4s ease;
	}
	.completeness-pct-small {
		font-size: 0.78rem;
		font-weight: 600;
	}

	/* AI Section */
	.ai-section { margin-bottom: 1.5rem; }
	.ai-row {
		display: flex;
		gap: 1rem;
		align-items: stretch;
	}
	.ai-autofill {
		flex: 1;
		background: rgba(0, 204, 150, 0.04);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 12px;
		padding: 1rem;
	}
	.af-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
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
		font-size: 0.75rem;
		color: var(--text-muted, #94a3b8);
	}
	.af-input-row {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
	}
	.af-input-row textarea { flex: 1; }
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
	.af-btn:hover { background: rgba(0, 204, 150, 0.2); }
	.af-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* Assistant Trigger */
	.assistant-trigger {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: rgba(0, 204, 150, 0.04);
		border: 1px dashed rgba(0, 204, 150, 0.25);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 200px;
		text-align: left;
	}
	.assistant-trigger:hover {
		background: rgba(0, 204, 150, 0.08);
		border-color: rgba(0, 204, 150, 0.4);
	}
	.assistant-icon {
		font-size: 1.5rem;
		color: var(--t, #00cc96);
	}
	.assistant-title {
		display: block;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--t, #00cc96);
	}
	.assistant-desc {
		display: block;
		font-size: 0.7rem;
		color: var(--text-muted, #94a3b8);
		margin-top: 0.15rem;
	}

	/* Assistant Panel */
	.assistant-panel {
		background: rgba(0, 204, 150, 0.03);
		border: 1px solid rgba(0, 204, 150, 0.15);
		border-radius: 12px;
		margin-bottom: 1.5rem;
		overflow: hidden;
	}
	.assistant-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(0, 204, 150, 0.1);
	}
	.assistant-header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.assistant-progress {
		font-size: 0.7rem;
		color: var(--text-muted, #94a3b8);
	}
	.assistant-close {
		background: none;
		border: none;
		color: var(--text-muted, #64748b);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}
	.assistant-close:hover { color: var(--text, #e2e8f0); }
	.assistant-messages {
		padding: 1rem;
		max-height: 350px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.msg {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}
	.msg-ai .msg-text {
		background: rgba(0, 204, 150, 0.06);
		border: 1px solid rgba(0, 204, 150, 0.1);
		border-radius: 10px 10px 10px 2px;
		padding: 0.5rem 0.75rem;
		font-size: 0.82rem;
		color: var(--text, #e2e8f0);
		line-height: 1.5;
		max-width: 85%;
	}
	.msg-user {
		justify-content: flex-end;
	}
	.msg-user .msg-text {
		background: rgba(0, 204, 150, 0.12);
		border: 1px solid rgba(0, 204, 150, 0.2);
		border-radius: 10px 10px 2px 10px;
		padding: 0.5rem 0.75rem;
		font-size: 0.82rem;
		color: var(--text, #e2e8f0);
		max-width: 85%;
	}
	.msg-avatar {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		background: rgba(0, 204, 150, 0.15);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		color: var(--t, #00cc96);
	}
	.typing {
		opacity: 0.6;
		font-style: italic;
	}
	.assistant-input-row {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid rgba(0, 204, 150, 0.1);
	}
	.assistant-input-row input {
		flex: 1;
	}

	/* Section Dividers */
	.section-divider {
		margin: 1.75rem 0 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 0.3rem;
	}
	.section-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--t, #00cc96);
	}

	/* Form Grid */
	.profile-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		margin-bottom: 1.25rem;
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
	textarea { resize: vertical; min-height: 2.5rem; }

	/* Multi-select sections */
	.multi-section { margin-bottom: 1.25rem; }
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
	.ai-suggest-btn:hover { background: rgba(0, 204, 150, 0.15); }
	.ai-suggest-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip-grid.compact { gap: 0.3rem; }
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
	.option-chip.dealbreaker.active {
		background: rgba(239, 68, 68, 0.12);
		border-color: #ef4444;
		color: #f87171;
	}
	.field-hint {
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
		justify-content: space-between;
		align-items: center;
	}
	.footer-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 640px) {
		.profile-grid { grid-template-columns: 1fr; }
		.af-input-row { flex-direction: column; }
		.ai-row { flex-direction: column; }
		.assistant-trigger { min-width: auto; }
	}
</style>
