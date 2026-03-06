<script lang="ts">
	import Button from '$components/ui/Button.svelte';

	interface DemoSession {
		id: string;
		vendorName: string;
		date: string;
		attendees: string[];
		status: 'scheduled' | 'completed';
		questionSet?: any[];
		notes?: string;
		aiDebrief?: {
			agreedPositives: string[];
			agreedConcerns: string[];
			keyDisagreement: string | null;
			recommendedFollowUp: string;
		};
	}

	let {
		session,
		onlaunchBriefing,
		onlaunchQuestions,
		onmarkComplete,
		onshowFeedback,
		onshowReport,
	}: {
		session: DemoSession;
		onlaunchBriefing?: (id: string) => void;
		onlaunchQuestions?: (vendor: string) => void;
		onmarkComplete?: (id: string) => void;
		onshowFeedback?: (id: string) => void;
		onshowReport?: (id: string) => void;
	} = $props();

	const isScheduled = $derived(session.status === 'scheduled');
	const isCompleted = $derived(session.status === 'completed');
	const formattedDate = $derived(
		session.date ? new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'TBD'
	);
</script>

<div class="demo-session-card" class:completed={isCompleted}>
	<div class="dsc-header">
		<div class="dsc-status" class:scheduled={isScheduled} class:done={isCompleted}>
			{isCompleted ? '✓ Completed' : '● Scheduled'}
		</div>
		<span class="dsc-date">{formattedDate}</span>
	</div>

	<div class="dsc-body">
		<div class="dsc-attendees">
			<span class="dsc-label">ATTENDEES</span>
			<div class="dsc-avatar-row">
				{#each session.attendees.slice(0, 5) as attendee}
					<span class="dsc-avatar" title={attendee}>{attendee.charAt(0).toUpperCase()}</span>
				{/each}
				{#if session.attendees.length > 5}
					<span class="dsc-more">+{session.attendees.length - 5}</span>
				{/if}
			</div>
		</div>

		{#if session.questionSet?.length}
			<div class="dsc-questions">
				<span class="dsc-label">QUESTIONS</span>
				<span class="dsc-count">{session.questionSet.length} prepared</span>
			</div>
		{/if}

		{#if session.notes}
			<p class="dsc-notes">{session.notes}</p>
		{/if}
	</div>

	{#if session.aiDebrief}
		<div class="dsc-debrief">
			<span class="dsc-label">AI DEBRIEF SUMMARY</span>
			{#if session.aiDebrief.agreedPositives?.length}
				<div class="debrief-item positive">
					<span class="debrief-icon">✓</span>
					<span>{session.aiDebrief.agreedPositives[0]}</span>
				</div>
			{/if}
			{#if session.aiDebrief.agreedConcerns?.length}
				<div class="debrief-item concern">
					<span class="debrief-icon">!</span>
					<span>{session.aiDebrief.agreedConcerns[0]}</span>
				</div>
			{/if}
			{#if session.aiDebrief.keyDisagreement}
				<div class="debrief-item disagree">
					<span class="debrief-icon">⇄</span>
					<span>{session.aiDebrief.keyDisagreement}</span>
				</div>
			{/if}
		</div>
	{/if}

	<div class="dsc-actions">
		{#if isScheduled}
			<Button variant="secondary" size="sm" onclick={() => onlaunchBriefing?.(session.id)}>
				Pre-Call Brief
			</Button>
			<Button variant="secondary" size="sm" onclick={() => onlaunchQuestions?.(session.vendorName)}>
				Demo Questions
			</Button>
			<Button variant="primary" size="sm" onclick={() => onmarkComplete?.(session.id)}>
				Mark Complete
			</Button>
		{:else}
			<Button variant="secondary" size="sm" onclick={() => onshowFeedback?.(session.id)}>
				Add Feedback
			</Button>
			<Button variant="primary" size="sm" onclick={() => onshowReport?.(session.id)}>
				View Report
			</Button>
		{/if}
	</div>
</div>

<style>
	.demo-session-card {
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		transition: border-color 0.15s;
	}
	.demo-session-card:hover { border-color: var(--neutral-300); }
	.demo-session-card.completed { border-color: rgba(0, 204, 150, 0.3); }

	.dsc-header { display: flex; justify-content: space-between; align-items: center; }
	.dsc-status {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		letter-spacing: 0.5px; padding: 2px 8px; border-radius: 999px;
	}
	.dsc-status.scheduled { background: rgba(74, 150, 248, 0.1); color: #4a96f8; }
	.dsc-status.done { background: rgba(0, 204, 150, 0.1); color: #00cc96; }
	.dsc-date { font-size: 0.8125rem; color: var(--neutral-500); }

	.dsc-body { display: flex; flex-direction: column; gap: var(--space-2); }
	.dsc-label {
		font-size: 0.625rem; font-weight: 700; letter-spacing: 1px;
		text-transform: uppercase; color: var(--neutral-400); display: block;
		margin-bottom: 4px;
	}

	.dsc-avatar-row { display: flex; gap: 0; }
	.dsc-avatar {
		width: 24px; height: 24px; border-radius: 50%;
		background: var(--primary-50, #eef2ff); color: var(--primary-600);
		display: flex; align-items: center; justify-content: center;
		font-weight: 700; font-size: 0.625rem; border: 2px solid white;
		margin-left: -4px;
	}
	.dsc-avatar:first-child { margin-left: 0; }
	.dsc-more { font-size: 0.6875rem; color: var(--neutral-400); margin-left: var(--space-1); }

	.dsc-questions { display: flex; flex-direction: column; }
	.dsc-count { font-size: 0.8125rem; color: var(--neutral-600); }
	.dsc-notes { font-size: 0.8125rem; color: var(--neutral-500); margin: 0; line-height: 1.5; }

	.dsc-debrief {
		padding: var(--space-3);
		background: var(--neutral-50);
		border-radius: var(--radius-md);
		display: flex; flex-direction: column; gap: var(--space-2);
	}
	.debrief-item {
		display: flex; align-items: flex-start; gap: var(--space-2);
		font-size: 0.8125rem; color: var(--neutral-700);
	}
	.debrief-icon { flex-shrink: 0; font-weight: 700; width: 16px; text-align: center; }
	.debrief-item.positive .debrief-icon { color: #00cc96; }
	.debrief-item.concern .debrief-icon { color: #f0a034; }
	.debrief-item.disagree .debrief-icon { color: #f05050; }

	.dsc-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
</style>
