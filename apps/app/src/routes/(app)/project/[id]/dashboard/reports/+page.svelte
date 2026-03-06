<script lang="ts">
	import { page } from '$app/stores';
	import Card from '$components/ui/Card.svelte';
	import Button from '$components/ui/Button.svelte';

	let { data } = $props();
	const project = data.project;
	const state = project?.state ?? {};
	const solveData = project?.solve_data ?? {};
	const projectId = $derived($page.params.id);

	const vendors = state.vendors ?? [];
	const criteria = state.criteria ?? [];
	const scores = state.scores ?? {};
	const hasScores = Object.keys(scores).length > 0;

	let exportingPdf = $state(false);
	let generatingExecBrief = $state(false);

	interface ReportCard {
		id: string;
		title: string;
		description: string;
		icon: string;
		status: string;
		action: string;
		available: boolean;
	}

	const reports: ReportCard[] = [
		{
			id: 'pre-eval',
			title: 'Pre-Evaluation Report',
			description: 'Problem statement, desired outcomes, criteria importance scores, and market overview.',
			icon: '📋',
			status: solveData.brief ? 'Ready' : 'Waiting for pre-eval data',
			action: 'View Report',
			available: !!solveData.brief,
		},
		{
			id: 'scorecard',
			title: 'Vendor Scorecard',
			description: 'Full weighted scoring comparison with ranked vendors, criteria breakdown, and side-by-side analysis.',
			icon: '📊',
			status: hasScores ? 'Ready' : 'Waiting for vendor scores',
			action: 'Export PDF',
			available: hasScores,
		},
		{
			id: 'exec-brief',
			title: 'Executive Decision Brief',
			description: 'Top recommendation, evaluation summary, non-negotiable criteria, and decision readiness checklist.',
			icon: '📄',
			status: hasScores ? 'Ready to generate' : 'Need vendor scores first',
			action: 'Generate Brief',
			available: hasScores,
		},
		{
			id: 'post-demo',
			title: 'Post-Demo Reports',
			description: 'Session-by-session demo feedback, attendee scores, and vendor comparison after demos.',
			icon: '🎯',
			status: (solveData.demoSessions ?? []).length > 0 ? `${(solveData.demoSessions ?? []).length} sessions` : 'No demos completed',
			action: 'View Reports',
			available: (solveData.demoSessions ?? []).length > 0,
		},
		{
			id: 'confidence',
			title: 'Decision Confidence Score',
			description: 'Completeness grading across all evaluation dimensions: scoring, demos, references, and team alignment.',
			icon: '🎯',
			status: hasScores ? 'Ready' : 'Need more data',
			action: 'Calculate Score',
			available: vendors.length > 0,
		},
		{
			id: 'negotiation',
			title: 'Negotiation Playbook',
			description: 'Vendor-specific negotiation strategies, benchmark pricing, and recommended terms.',
			icon: '🤝',
			status: vendors.length > 0 ? 'Available' : 'Add vendors first',
			action: 'View Playbook',
			available: vendors.length > 0,
		},
	];

	async function handleReportAction(reportId: string) {
		switch (reportId) {
			case 'scorecard':
				exportingPdf = true;
				try {
					window.open(`/api/projects/${projectId}/export`, '_blank');
				} finally {
					exportingPdf = false;
				}
				break;
			case 'exec-brief':
				generatingExecBrief = true;
				// TODO: Navigate to exec brief generator
				generatingExecBrief = false;
				break;
			case 'pre-eval':
				window.location.href = `/project/${projectId}/solve/brief`;
				break;
			case 'confidence':
				// TODO: Navigate to confidence calculator
				break;
			case 'negotiation':
				// TODO: Navigate to negotiation page
				break;
			case 'post-demo':
				// TODO: Navigate to demo reports
				break;
		}
	}
</script>

<svelte:head>
	<title>Reports — {project?.name} — Shortlist</title>
</svelte:head>

<div class="reports-tab">
	<div class="reports-grid">
		{#each reports as report (report.id)}
			<Card>
				<div class="report-card">
					<div class="rc-header">
						<span class="rc-icon">{report.icon}</span>
						<div class="rc-meta">
							<h3 class="rc-title">{report.title}</h3>
							<span class="rc-status" class:ready={report.available} class:waiting={!report.available}>
								{report.status}
							</span>
						</div>
					</div>
					<p class="rc-desc">{report.description}</p>
					<Button
						variant={report.available ? 'primary' : 'ghost'}
						size="sm"
						disabled={!report.available}
						onclick={() => handleReportAction(report.id)}
					>
						{report.action}
					</Button>
				</div>
			</Card>
		{/each}
	</div>

	<!-- Quick Export Controls -->
	<Card>
		<h3 class="section-label">QUICK EXPORT</h3>
		<div class="export-controls">
			<Button variant="secondary" size="sm" onclick={() => window.open(`/api/projects/${projectId}/export`, '_blank')}
				disabled={!hasScores}>
				↓ Export HTML Report
			</Button>
			<Button variant="secondary" size="sm" disabled>
				↓ Export CSV (coming soon)
			</Button>
			<Button variant="secondary" size="sm" disabled>
				↓ Export JSON (coming soon)
			</Button>
		</div>
	</Card>
</div>

<style>
	.reports-tab { display: flex; flex-direction: column; gap: var(--space-4); }

	.reports-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-3);
	}

	.report-card {
		display: flex; flex-direction: column; gap: var(--space-3);
	}

	.rc-header { display: flex; align-items: flex-start; gap: var(--space-2); }
	.rc-icon { font-size: 1.5rem; flex-shrink: 0; }
	.rc-meta { flex: 1; }
	.rc-title { font-size: 0.9375rem; font-weight: 700; color: var(--neutral-800); margin: 0 0 2px 0; }
	.rc-status {
		font-size: 0.6875rem; font-weight: 600; text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.rc-status.ready { color: #00cc96; }
	.rc-status.waiting { color: var(--neutral-400); }

	.rc-desc {
		font-size: 0.8125rem; color: var(--neutral-500); line-height: 1.6; margin: 0;
	}

	.section-label {
		font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.5px;
		text-transform: uppercase; color: var(--primary-500); margin-bottom: var(--space-3);
	}

	.export-controls { display: flex; gap: var(--space-2); flex-wrap: wrap; }

	@media (max-width: 640px) {
		.reports-grid { grid-template-columns: 1fr; }
	}
</style>
