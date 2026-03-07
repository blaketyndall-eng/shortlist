<script lang="ts">
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';

	let items = $state<any[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let statusFilter = $state('pending');
	let actionLoading = $state<string | null>(null);

	async function loadQueue() {
		loading = true;
		try {
			const res = await fetch(`/api/vendors/queue?status=${statusFilter}&limit=50`);
			if (res.ok) {
				const data = await res.json();
				items = data.items;
				total = data.total;
			}
		} catch { /* ignore */ }
		loading = false;
	}

	async function reviewItem(itemId: string, approved: boolean) {
		actionLoading = itemId;
		try {
			await fetch('/api/vendors/queue', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ itemId, approved }),
			});
			items = items.filter((i) => i.id !== itemId);
			total--;
		} catch { /* ignore */ }
		actionLoading = null;
	}

	function confidenceColor(confidence: number): string {
		if (confidence >= 0.85) return 'var(--success-600, #16a34a)';
		if (confidence >= 0.50) return 'var(--warning-600, #d97706)';
		return 'var(--error-600, #dc2626)';
	}

	function formatValue(value: unknown): string {
		if (typeof value === 'string') {
			try {
				const parsed = JSON.parse(value);
				if (Array.isArray(parsed)) return parsed.join(', ');
				return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
			} catch {
				return value;
			}
		}
		if (Array.isArray(value)) return value.join(', ');
		return JSON.stringify(value);
	}

	$effect(() => { loadQueue(); });
</script>

<svelte:head>
	<title>Vendor Enrichment Queue — Shortlist Admin</title>
</svelte:head>

<div class="queue-page">
	<header class="page-header">
		<h1>Enrichment Review Queue</h1>
		<p>Review AI-generated vendor intelligence before it's applied.</p>
	</header>

	<div class="filters">
		<select bind:value={statusFilter} onchange={loadQueue}>
			<option value="pending">Pending Review</option>
			<option value="auto_applied">Auto-Applied</option>
			<option value="approved">Approved</option>
			<option value="rejected">Rejected</option>
		</select>
		<span class="count">{total} item{total !== 1 ? 's' : ''}</span>
	</div>

	{#if loading}
		<Card><p class="loading-text">Loading queue...</p></Card>
	{:else if items.length === 0}
		<Card>
			<div class="empty">
				<p>No {statusFilter} items in the queue.</p>
			</div>
		</Card>
	{:else}
		<div class="queue-list">
			{#each items as item (item.id)}
				<Card padding="sm">
					<div class="queue-item">
						<div class="item-header">
							<span class="vendor-name">{item.vendor_library?.name ?? 'Unknown'}</span>
							<span class="field-name">{item.field_name.replace('ai_', '').replace(/_/g, ' ')}</span>
							<span class="confidence" style="color: {confidenceColor(item.confidence)}">
								{(item.confidence * 100).toFixed(0)}%
							</span>
							<span class="source-badge">{item.source.replace('_', ' ')}</span>
						</div>
						<div class="item-value">
							<pre>{formatValue(item.proposed_value)}</pre>
						</div>
						{#if statusFilter === 'pending'}
							<div class="item-actions">
								<Button
									variant="primary"
									onclick={() => reviewItem(item.id, true)}
									loading={actionLoading === item.id}
								>
									Approve
								</Button>
								<Button
									variant="ghost"
									onclick={() => reviewItem(item.id, false)}
									loading={actionLoading === item.id}
								>
									Reject
								</Button>
							</div>
						{:else}
							<div class="item-status">
								<span class="status-badge" class:approved={item.status === 'approved' || item.status === 'auto_applied'} class:rejected={item.status === 'rejected'}>
									{item.status.replace('_', ' ')}
								</span>
								{#if item.reason}
									<span class="reason">{item.reason}</span>
								{/if}
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<style>
	.queue-page { max-width: 900px; margin: 0 auto; padding: var(--space-6); }
	.page-header { margin-bottom: var(--space-4); }
	.page-header h1 { margin-bottom: var(--space-1); }
	.page-header p { color: var(--neutral-500); margin: 0; }

	.filters {
		display: flex; align-items: center; gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	.filters select {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--neutral-200);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
	}
	.count { font-size: 0.8125rem; color: var(--neutral-500); }

	.queue-list { display: flex; flex-direction: column; gap: var(--space-3); }

	.queue-item { display: flex; flex-direction: column; gap: var(--space-2); }

	.item-header {
		display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
	}
	.vendor-name { font-weight: 700; font-size: 0.9375rem; color: var(--neutral-800); }
	.field-name {
		font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.5px; color: var(--primary-500);
		padding: 2px 8px; background: var(--primary-50); border-radius: 999px;
	}
	.confidence { font-weight: 800; font-size: 0.875rem; }
	.source-badge {
		font-size: 0.6875rem; padding: 2px 6px;
		background: var(--neutral-100); color: var(--neutral-500);
		border-radius: var(--radius-sm); text-transform: capitalize;
	}

	.item-value pre {
		font-size: 0.8125rem; color: var(--neutral-600); line-height: 1.5;
		white-space: pre-wrap; word-break: break-word; margin: 0;
		padding: var(--space-2) var(--space-3); background: var(--neutral-50);
		border-radius: var(--radius-md); max-height: 200px; overflow-y: auto;
	}

	.item-actions { display: flex; gap: var(--space-2); }

	.item-status { display: flex; align-items: center; gap: var(--space-2); }
	.status-badge {
		font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
		padding: 2px 8px; border-radius: 999px;
		background: var(--neutral-100); color: var(--neutral-500);
	}
	.status-badge.approved { background: rgba(0, 204, 150, 0.1); color: #00cc96; }
	.status-badge.rejected { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
	.reason { font-size: 0.75rem; color: var(--neutral-400); }

	.loading-text, .empty { text-align: center; padding: var(--space-4); color: var(--neutral-500); }
</style>
