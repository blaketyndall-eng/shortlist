<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';

	let { data } = $props();
	const project = data.project;
	const solveData = project?.solve_data ?? {};
	const state = project?.state ?? {};
	const projectId = $derived($page.params.id);

	interface CalendarEvent {
		id: string;
		title: string;
		type: 'demo' | 'trial' | 'security' | 'discovery' | 'decision' | 'pricing';
		vendor?: string;
		date: string;
		notes?: string;
		status?: string;
	}

	let events = $state<CalendarEvent[]>(solveData.calendarEvents ?? []);
	let showAddForm = $state(false);
	let newEvent = $state<Partial<CalendarEvent>>({
		title: '', type: 'demo', vendor: '', date: '', notes: '',
	});

	const vendors = state.vendors ?? [];

	const typeColors: Record<string, { bg: string; text: string; label: string }> = {
		demo: { bg: 'rgba(74, 150, 248, 0.08)', text: '#4a96f8', label: 'Demo' },
		trial: { bg: 'rgba(0, 204, 150, 0.08)', text: '#00cc96', label: 'Trial/POC' },
		security: { bg: 'rgba(239, 68, 68, 0.08)', text: '#dc2626', label: 'Security' },
		discovery: { bg: 'rgba(139, 92, 246, 0.08)', text: '#8b5cf6', label: 'Discovery' },
		decision: { bg: 'rgba(245, 158, 11, 0.08)', text: '#d97706', label: 'Decision' },
		pricing: { bg: 'rgba(16, 185, 129, 0.08)', text: '#059669', label: 'Pricing' },
	};

	const sortedEvents = $derived(
		[...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
	);

	const upcomingEvents = $derived(
		sortedEvents.filter((e) => new Date(e.date) >= new Date())
	);

	const pastEvents = $derived(
		sortedEvents.filter((e) => new Date(e.date) < new Date())
	);

	function addEvent() {
		if (!newEvent.title?.trim() || !newEvent.date) return;
		events = [...events, {
			id: crypto.randomUUID(),
			title: newEvent.title!.trim(),
			type: newEvent.type as CalendarEvent['type'],
			vendor: newEvent.vendor || undefined,
			date: newEvent.date!,
			notes: newEvent.notes || undefined,
		}];
		newEvent = { title: '', type: 'demo', vendor: '', date: '', notes: '' };
		showAddForm = false;
	}

	function removeEvent(id: string) {
		events = events.filter((e) => e.id !== id);
	}

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString('en-US', {
			weekday: 'short', month: 'short', day: 'numeric',
		});
	}
</script>

<svelte:head>
	<title>Calendar — {project?.name} — Shortlist</title>
</svelte:head>

<div class="calendar-tab">
	<div class="cal-header">
		<span class="cal-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
		<Button variant="secondary" size="sm" onclick={() => showAddForm = !showAddForm}>
			{showAddForm ? 'Cancel' : '+ Add Event'}
		</Button>
	</div>

	<!-- Add event form -->
	{#if showAddForm}
		<Card>
			<div class="add-form">
				<div class="form-row">
					<input type="text" bind:value={newEvent.title} placeholder="Event title" class="form-input" />
					<select bind:value={newEvent.type} class="form-select">
						{#each Object.entries(typeColors) as [key, val]}
							<option value={key}>{val.label}</option>
						{/each}
					</select>
				</div>
				<div class="form-row">
					<input type="date" bind:value={newEvent.date} class="form-input" />
					<select bind:value={newEvent.vendor} class="form-select">
						<option value="">No vendor</option>
						{#each vendors as v}
							<option value={v}>{v}</option>
						{/each}
					</select>
				</div>
				<input type="text" bind:value={newEvent.notes} placeholder="Notes (optional)" class="form-input" />
				<Button variant="primary" size="sm" onclick={addEvent}
					disabled={!newEvent.title?.trim() || !newEvent.date}>Add Event</Button>
			</div>
		</Card>
	{/if}

	<!-- Legend -->
	<div class="legend">
		{#each Object.entries(typeColors) as [, val]}
			<span class="legend-item" style="color: {val.text}">
				<span class="legend-dot" style="background: {val.text}"></span>
				{val.label}
			</span>
		{/each}
	</div>

	<!-- Upcoming -->
	{#if upcomingEvents.length > 0}
		<div class="event-section">
			<h3 class="section-label">UPCOMING</h3>
			{#each upcomingEvents as evt (evt.id)}
				{@const tc = typeColors[evt.type] ?? typeColors.demo}
				<div class="event-row">
					<div class="event-date">{formatDate(evt.date)}</div>
					<div class="event-badge" style="background: {tc.bg}; color: {tc.text}">{tc.label}</div>
					<div class="event-body">
						<span class="event-title">{evt.title}</span>
						{#if evt.vendor}
							<span class="event-vendor">{evt.vendor}</span>
						{/if}
					</div>
					<button class="remove-btn" onclick={() => removeEvent(evt.id)} type="button" aria-label="Remove">✕</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Past -->
	{#if pastEvents.length > 0}
		<div class="event-section">
			<h3 class="section-label past-label">PAST</h3>
			{#each pastEvents as evt (evt.id)}
				{@const tc = typeColors[evt.type] ?? typeColors.demo}
				<div class="event-row past">
					<div class="event-date">{formatDate(evt.date)}</div>
					<div class="event-badge" style="background: {tc.bg}; color: {tc.text}">{tc.label}</div>
					<div class="event-body">
						<span class="event-title">{evt.title}</span>
						{#if evt.vendor}
							<span class="event-vendor">{evt.vendor}</span>
						{/if}
					</div>
					<button class="remove-btn" onclick={() => removeEvent(evt.id)} type="button" aria-label="Remove">✕</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if events.length === 0 && !showAddForm}
		<Card>
			<div class="empty-state">
				<p>No events scheduled yet. Add demos, trials, and milestones to track your evaluation timeline.</p>
			</div>
		</Card>
	{/if}
</div>

<style>
	.calendar-tab { display: flex; flex-direction: column; gap: var(--space-4); }

	.cal-header { display: flex; justify-content: space-between; align-items: center; }
	.cal-count { font-size: 0.875rem; color: var(--neutral-500); }

	.add-form { display: flex; flex-direction: column; gap: var(--space-3); }
	.form-row { display: flex; gap: var(--space-2); }
	.form-input {
		flex: 1; padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md);
		font-size: 0.875rem;
	}
	.form-input:focus { outline: var(--focus-ring); border-color: var(--primary-500); }
	.form-select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-300); border-radius: var(--radius-md);
		font-size: 0.875rem; background: var(--color-bg-secondary); min-width: 130px;
	}

	.legend { display: flex; gap: var(--space-3); flex-wrap: wrap; font-size: 0.75rem; }
	.legend-item { display: flex; align-items: center; gap: 4px; }
	.legend-dot { width: 8px; height: 8px; border-radius: 50%; }

	.section-label {
		font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.5px;
		text-transform: uppercase; color: var(--primary-500); margin-bottom: var(--space-2);
	}
	.past-label { color: var(--neutral-400); }

	.event-section { display: flex; flex-direction: column; gap: var(--space-2); }

	.event-row {
		display: flex; align-items: center; gap: var(--space-3);
		padding: var(--space-3); background: var(--color-bg-secondary);
		border: 1px solid var(--neutral-100); border-radius: var(--radius-md);
	}
	.event-row.past { opacity: 0.6; }

	.event-date {
		font-size: 0.8125rem; font-weight: 600; color: var(--neutral-600);
		min-width: 90px; flex-shrink: 0;
	}
	.event-badge {
		font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0;
	}
	.event-body { flex: 1; min-width: 0; }
	.event-title { font-size: 0.875rem; font-weight: 500; color: var(--neutral-800); }
	.event-vendor {
		font-size: 0.75rem; color: var(--neutral-500); margin-left: var(--space-2);
	}

	.remove-btn {
		background: none; border: none; color: var(--neutral-300);
		cursor: pointer; padding: 4px; font-size: 0.75rem;
	}
	.remove-btn:hover { color: #dc2626; }

	.empty-state {
		text-align: center; padding: var(--space-4);
		color: var(--neutral-500); font-size: 0.875rem;
	}

	@media (max-width: 640px) {
		.form-row { flex-direction: column; }
		.event-row { flex-wrap: wrap; }
		.event-date { min-width: unset; }
	}
</style>
