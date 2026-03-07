<script lang="ts">
	import { page } from '$app/stores';
	import { projectStore } from '$lib/stores/project.svelte';

	const projectId = $derived($page.params.id);

	interface Task {
		id: string;
		phase: 'pre-launch' | 'launch' | 'post-launch' | 'optimization';
		title: string;
		description: string;
		owner: string;
		dueDate: string;
		status: 'not-started' | 'in-progress' | 'blocked' | 'completed';
		priority: 'critical' | 'high' | 'medium' | 'low';
		dependencies: string[];
		notes: string;
		vendor?: string;
	}

	interface ImplPlan {
		selectedVendor: string;
		startDate: string;
		targetGoLive: string;
		tasks: Task[];
	}

	let plan = $state<ImplPlan>({
		selectedVendor: '',
		startDate: '',
		targetGoLive: '',
		tasks: []
	});

	let showAdd = $state(false);
	let filterPhase = $state<string>('all');
	let filterStatus = $state<string>('all');
	let aiLoading = $state(false);

	let newTask = $state<Partial<Task>>({
		phase: 'pre-launch', title: '', description: '', owner: '',
		dueDate: '', status: 'not-started', priority: 'medium',
		dependencies: [], notes: '', vendor: ''
	});

	$effect(() => { loadPlan(); });

	async function loadPlan() {
		try {
			const res = await fetch(`/api/projects/${projectId}/implementation`);
			if (res.ok) {
				const data = await res.json();
				if (data.plan) plan = data.plan;
			}
		} catch { /* */ }
	}

	async function savePlan() {
		await fetch(`/api/projects/${projectId}/implementation`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ plan })
		});
	}

	function addTask() {
		if (!newTask.title) return;
		const task: Task = {
			id: crypto.randomUUID(),
			phase: newTask.phase as Task['phase'],
			title: newTask.title!,
			description: newTask.description ?? '',
			owner: newTask.owner ?? '',
			dueDate: newTask.dueDate ?? '',
			status: 'not-started',
			priority: newTask.priority as Task['priority'],
			dependencies: [],
			notes: newTask.notes ?? '',
			vendor: newTask.vendor || undefined
		};
		plan.tasks = [...plan.tasks, task];
		savePlan();
		newTask = {
			phase: 'pre-launch', title: '', description: '', owner: '',
			dueDate: '', status: 'not-started', priority: 'medium',
			dependencies: [], notes: '', vendor: ''
		};
		showAdd = false;
	}

	function cycleStatus(id: string) {
		const order: Task['status'][] = ['not-started', 'in-progress', 'blocked', 'completed'];
		plan.tasks = plan.tasks.map((t) => {
			if (t.id === id) {
				const next = order[(order.indexOf(t.status) + 1) % order.length];
				return { ...t, status: next };
			}
			return t;
		});
		savePlan();
	}

	function removeTask(id: string) {
		plan.tasks = plan.tasks.filter((t) => t.id !== id);
		savePlan();
	}

	async function generatePlan() {
		aiLoading = true;
		try {
			const proj = projectStore.currentProject;
			const state = (proj?.state as Record<string, any>) ?? {};
			const vendors = state.vendors ?? [];
			const winner = vendors.length > 0 ? vendors[0] : null;

			const res = await fetch('/api/ai/engine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					engine: 'implementation_plan',
					depth: 'deep',
					projectId,
					context: {
						vendor: winner?.name ?? plan.selectedVendor ?? 'Selected Vendor',
						category: state.category ?? '',
						problem: state.problem ?? '',
						teamSize: state.teamSize ?? 5,
						timeline: plan.targetGoLive ? `Target go-live: ${plan.targetGoLive}` : '90 days',
						existingTasks: plan.tasks.map((t) => t.title)
					}
				})
			});
			if (!res.ok) throw new Error('Generation failed');
			const data = await res.json();
			const result = data.result;

			if (result?.tasks && Array.isArray(result.tasks)) {
				const generated: Task[] = result.tasks.map((t: any) => ({
					id: crypto.randomUUID(),
					phase: t.phase ?? 'pre-launch',
					title: t.title ?? t.name ?? '',
					description: t.description ?? '',
					owner: t.owner ?? '',
					dueDate: t.dueDate ?? '',
					status: 'not-started' as const,
					priority: t.priority ?? 'medium',
					dependencies: t.dependencies ?? [],
					notes: t.notes ?? '',
					vendor: t.vendor
				}));
				plan.tasks = [...plan.tasks, ...generated];
				await savePlan();
			}
		} catch { /* */ } finally {
			aiLoading = false;
		}
	}

	let filteredTasks = $derived.by(() => {
		return plan.tasks.filter((t) => {
			if (filterPhase !== 'all' && t.phase !== filterPhase) return false;
			if (filterStatus !== 'all' && t.status !== filterStatus) return false;
			return true;
		});
	});

	let phaseTasks = $derived.by(() => {
		const phases = ['pre-launch', 'launch', 'post-launch', 'optimization'] as const;
		return phases.map((p) => ({
			phase: p,
			tasks: filteredTasks.filter((t) => t.phase === p)
		})).filter((g) => g.tasks.length > 0);
	});

	let stats = $derived.by(() => {
		const total = plan.tasks.length;
		const completed = plan.tasks.filter((t) => t.status === 'completed').length;
		const blocked = plan.tasks.filter((t) => t.status === 'blocked').length;
		const inProgress = plan.tasks.filter((t) => t.status === 'in-progress').length;
		const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
		return { total, completed, blocked, inProgress, progress };
	});

	const phaseLabel: Record<string, string> = {
		'pre-launch': 'Pre-Launch',
		launch: 'Launch',
		'post-launch': 'Post-Launch',
		optimization: 'Optimization'
	};

	const phaseIcon: Record<string, string> = {
		'pre-launch': '🔧',
		launch: '🚀',
		'post-launch': '📊',
		optimization: '⚡'
	};

	const statusColor: Record<string, string> = {
		'not-started': '#64748b',
		'in-progress': '#f59e0b',
		blocked: '#ef4444',
		completed: '#00cc96'
	};

	const priorityColor: Record<string, string> = {
		critical: '#ef4444',
		high: '#f59e0b',
		medium: '#4a96f8',
		low: '#64748b'
	};

	const today = new Date().toISOString().split('T')[0];

	function daysUntil(dateStr: string): number {
		if (!dateStr) return Infinity;
		const diff = new Date(dateStr + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	}
</script>

<svelte:head>
	<title>Implementation Plan | Shortlist</title>
</svelte:head>

<div class="impl-page">
	<div class="impl-header">
		<div>
			<h1>Implementation Plan</h1>
			<p class="subtitle">Track every step from vendor selection through go-live and beyond.</p>
		</div>
		<div class="header-actions">
			<button class="ai-btn" onclick={generatePlan} disabled={aiLoading}>
				{#if aiLoading}
					<span class="spin">⟳</span> Generating…
				{:else}
					✦ AI Generate Plan
				{/if}
			</button>
			<button class="add-btn" onclick={() => (showAdd = !showAdd)}>+ Add Task</button>
		</div>
	</div>

	<!-- Plan meta -->
	<div class="plan-meta">
		<div class="meta-field">
			<label>Selected Vendor</label>
			<input type="text" bind:value={plan.selectedVendor} placeholder="e.g. Acme Corp" onblur={savePlan} />
		</div>
		<div class="meta-field">
			<label>Start Date</label>
			<input type="date" bind:value={plan.startDate} onchange={savePlan} />
		</div>
		<div class="meta-field">
			<label>Target Go-Live</label>
			<input type="date" bind:value={plan.targetGoLive} onchange={savePlan} />
		</div>
		{#if plan.startDate && plan.targetGoLive}
			<div class="meta-duration">
				{daysUntil(plan.targetGoLive)} days to go-live
			</div>
		{/if}
	</div>

	<!-- Progress -->
	<div class="stats-row">
		<div class="stat-card">
			<span class="stat-num">{stats.progress}%</span>
			<span class="stat-lbl">Complete</span>
		</div>
		<div class="stat-card">
			<span class="stat-num" style="color: #f59e0b">{stats.inProgress}</span>
			<span class="stat-lbl">In Progress</span>
		</div>
		<div class="stat-card">
			<span class="stat-num" style="color: #ef4444">{stats.blocked}</span>
			<span class="stat-lbl">Blocked</span>
		</div>
		<div class="stat-card">
			<span class="stat-num" style="color: #00cc96">{stats.completed}</span>
			<span class="stat-lbl">Done</span>
		</div>
	</div>

	<div class="progress-bar">
		<div class="prog-fill" style="width: {stats.progress}%"></div>
	</div>

	<!-- Filters -->
	<div class="filters">
		<div class="filter-group">
			<span class="filter-lbl">Phase:</span>
			{#each ['all', 'pre-launch', 'launch', 'post-launch', 'optimization'] as p}
				<button
					class="filter-chip"
					class:active={filterPhase === p}
					onclick={() => (filterPhase = p)}
				>{p === 'all' ? 'All' : phaseLabel[p]}</button>
			{/each}
		</div>
		<div class="filter-group">
			<span class="filter-lbl">Status:</span>
			{#each ['all', 'not-started', 'in-progress', 'blocked', 'completed'] as s}
				<button
					class="filter-chip"
					class:active={filterStatus === s}
					onclick={() => (filterStatus = s)}
				>{s === 'all' ? 'All' : s}</button>
			{/each}
		</div>
	</div>

	<!-- Add form -->
	{#if showAdd}
		<div class="add-form">
			<div class="form-row">
				<input type="text" bind:value={newTask.title} placeholder="Task title" />
				<select bind:value={newTask.phase}>
					<option value="pre-launch">Pre-Launch</option>
					<option value="launch">Launch</option>
					<option value="post-launch">Post-Launch</option>
					<option value="optimization">Optimization</option>
				</select>
				<select bind:value={newTask.priority}>
					<option value="critical">Critical</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>
			</div>
			<div class="form-row">
				<input type="text" bind:value={newTask.owner} placeholder="Owner" />
				<input type="date" bind:value={newTask.dueDate} />
				<textarea bind:value={newTask.description} placeholder="Description…" rows="1"></textarea>
				<button class="save-btn" onclick={addTask}>Add</button>
			</div>
		</div>
	{/if}

	<!-- Task list grouped by phase -->
	<div class="task-phases">
		{#each phaseTasks as group}
			<div class="phase-group">
				<div class="phase-header">
					<span class="phase-icon">{phaseIcon[group.phase]}</span>
					<span class="phase-label">{phaseLabel[group.phase]}</span>
					<span class="phase-count">{group.tasks.length}</span>
				</div>
				<div class="phase-tasks">
					{#each group.tasks as task (task.id)}
						{@const days = daysUntil(task.dueDate)}
						<div class="task-row" class:completed={task.status === 'completed'} class:blocked={task.status === 'blocked'}>
							<div class="task-status-dot" style="background: {statusColor[task.status]}"></div>
							<div class="task-info">
								<div class="task-top">
									<span class="task-title">{task.title}</span>
									<span class="task-priority" style="color: {priorityColor[task.priority]}">{task.priority}</span>
								</div>
								{#if task.description}
									<p class="task-desc">{task.description}</p>
								{/if}
								<div class="task-meta">
									{#if task.owner}
										<span class="task-owner">👤 {task.owner}</span>
									{/if}
									{#if task.dueDate}
										<span class="task-due" class:overdue={days < 0 && task.status !== 'completed'}>
											📅 {task.dueDate}
											{#if days < 0 && task.status !== 'completed'}
												<span class="overdue-tag">{Math.abs(days)}d overdue</span>
											{:else if days <= 7 && days >= 0 && task.status !== 'completed'}
												<span class="soon-tag">{days}d left</span>
											{/if}
										</span>
									{/if}
									{#if task.vendor}
										<span class="task-vendor">{task.vendor}</span>
									{/if}
								</div>
								{#if task.notes}
									<p class="task-notes">{task.notes}</p>
								{/if}
							</div>
							<div class="task-actions">
								<button
									class="status-btn"
									style="color: {statusColor[task.status]}"
									onclick={() => cycleStatus(task.id)}
									title="Click to change status"
								>{task.status}</button>
								<button class="remove-btn" onclick={() => removeTask(task.id)}>×</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		{#if plan.tasks.length === 0}
			<div class="empty">
				<p>No implementation tasks yet.</p>
				<p class="empty-hint">Use <strong>AI Generate Plan</strong> to create a comprehensive implementation plan, or add tasks manually.</p>
			</div>
		{:else if filteredTasks.length === 0}
			<div class="empty">No tasks match current filters.</div>
		{/if}
	</div>
</div>

<style>
	.impl-page { padding: 2rem 1.5rem; max-width: 900px; margin: 0 auto; }
	.impl-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
	h1 { font-family: 'Playfair Display', serif; font-size: 1.8rem; color: var(--text, #e2e8f0); margin: 0; }
	.subtitle { font-size: 0.85rem; color: var(--text-muted, #94a3b8); margin: 0.3rem 0 0; }
	.header-actions { display: flex; gap: 0.5rem; }
	.ai-btn {
		padding: 0.45rem 0.85rem; background: rgba(0, 204, 150, 0.08);
		border: 1px solid rgba(0, 204, 150, 0.2); border-radius: 6px;
		color: var(--t, #00cc96); font-size: 0.8rem; cursor: pointer;
	}
	.ai-btn:hover { background: rgba(0, 204, 150, 0.15); }
	.ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.spin { display: inline-block; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.add-btn {
		padding: 0.45rem 0.85rem; background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.8rem; cursor: pointer;
	}

	.plan-meta {
		display: flex; gap: 0.75rem; align-items: flex-end;
		margin-bottom: 1.5rem; flex-wrap: wrap;
	}
	.meta-field { display: flex; flex-direction: column; gap: 0.2rem; }
	.meta-field label { font-size: 0.65rem; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.04em; }
	.meta-field input {
		padding: 0.4rem 0.6rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.82rem; font-family: 'Figtree', sans-serif;
	}
	.meta-duration {
		font-size: 0.82rem; color: var(--t, #00cc96); font-weight: 600;
		padding-bottom: 0.4rem;
	}

	.stats-row {
		display: flex; gap: 0.75rem; margin-bottom: 0.75rem;
	}
	.stat-card {
		flex: 1; display: flex; flex-direction: column; align-items: center;
		padding: 0.6rem; background: rgba(0, 0, 0, 0.12); border-radius: 8px;
	}
	.stat-num {
		font-size: 1.4rem; font-weight: 700; color: var(--text, #e2e8f0);
		font-family: 'Playfair Display', serif;
	}
	.stat-lbl { font-size: 0.65rem; color: var(--text-muted, #64748b); text-transform: uppercase; }

	.progress-bar {
		height: 6px; background: rgba(255, 255, 255, 0.06); border-radius: 3px;
		overflow: hidden; margin-bottom: 1.25rem;
	}
	.prog-fill { height: 100%; background: var(--t, #00cc96); border-radius: 3px; transition: width 0.4s; }

	.filters { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; }
	.filter-group { display: flex; align-items: center; gap: 0.3rem; }
	.filter-lbl { font-size: 0.7rem; color: var(--text-muted, #64748b); margin-right: 0.2rem; }
	.filter-chip {
		padding: 0.2rem 0.5rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 4px;
		color: var(--text-muted, #94a3b8); font-size: 0.68rem; cursor: pointer;
		text-transform: capitalize;
	}
	.filter-chip.active {
		background: rgba(0, 204, 150, 0.1); border-color: var(--t, #00cc96);
		color: var(--t, #00cc96);
	}

	.add-form {
		background: rgba(0, 0, 0, 0.15); border-radius: 10px; padding: 1rem;
		display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;
	}
	.form-row { display: flex; gap: 0.5rem; }
	.add-form input, .add-form textarea, .add-form select {
		flex: 1; padding: 0.45rem 0.65rem; background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
		color: var(--text, #e2e8f0); font-size: 0.82rem; font-family: 'Figtree', sans-serif;
	}
	.save-btn {
		padding: 0.4rem 0.85rem; background: var(--t, #00cc96); border: none;
		border-radius: 6px; color: #0b1017; font-size: 0.8rem; font-weight: 600; cursor: pointer;
	}

	.phase-group { margin-bottom: 1.5rem; }
	.phase-header {
		display: flex; align-items: center; gap: 0.4rem;
		margin-bottom: 0.6rem; padding-bottom: 0.4rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.phase-icon { font-size: 0.9rem; }
	.phase-label { font-size: 0.85rem; font-weight: 600; color: var(--text, #e2e8f0); }
	.phase-count {
		font-size: 0.6rem; background: rgba(255, 255, 255, 0.06);
		padding: 0.1rem 0.35rem; border-radius: 10px;
		color: var(--text-muted, #94a3b8);
	}

	.task-row {
		display: flex; align-items: flex-start; gap: 0.75rem;
		padding: 0.65rem 0.85rem; background: rgba(0, 0, 0, 0.08);
		border-radius: 8px; margin-bottom: 0.4rem;
		transition: opacity 0.2s;
	}
	.task-row.completed { opacity: 0.55; }
	.task-row.blocked { border-left: 3px solid #ef4444; }

	.task-status-dot {
		width: 10px; height: 10px; border-radius: 50%;
		flex-shrink: 0; margin-top: 0.3rem;
	}
	.task-info { flex: 1; min-width: 0; }
	.task-top { display: flex; align-items: center; gap: 0.4rem; }
	.task-title { font-size: 0.85rem; color: var(--text, #e2e8f0); font-weight: 600; }
	.task-priority {
		font-size: 0.55rem; text-transform: uppercase; font-weight: 700;
		letter-spacing: 0.04em;
	}
	.task-desc { margin: 0.2rem 0 0; font-size: 0.75rem; color: var(--text-muted, #94a3b8); line-height: 1.4; }
	.task-meta { display: flex; gap: 0.6rem; margin-top: 0.25rem; flex-wrap: wrap; }
	.task-owner, .task-due, .task-vendor {
		font-size: 0.7rem; color: var(--text-muted, #64748b);
	}
	.task-vendor {
		background: rgba(255, 255, 255, 0.06); padding: 0.05rem 0.3rem;
		border-radius: 3px;
	}
	.task-due.overdue { color: #ef4444; }
	.overdue-tag {
		background: rgba(239, 68, 68, 0.15); padding: 0.05rem 0.25rem;
		border-radius: 3px; font-size: 0.6rem; color: #f87171; margin-left: 0.2rem;
	}
	.soon-tag {
		background: rgba(245, 158, 11, 0.15); padding: 0.05rem 0.25rem;
		border-radius: 3px; font-size: 0.6rem; color: #fbbf24; margin-left: 0.2rem;
	}
	.task-notes { margin: 0.2rem 0 0; font-size: 0.7rem; color: var(--text-muted, #64748b); font-style: italic; }

	.task-actions { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end; }
	.status-btn {
		padding: 0.15rem 0.4rem; background: none;
		border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 3px;
		font-size: 0.6rem; text-transform: uppercase; font-weight: 700;
		letter-spacing: 0.04em; cursor: pointer;
	}
	.remove-btn {
		background: none; border: none; color: var(--text-muted, #64748b);
		font-size: 0.9rem; cursor: pointer; opacity: 0; transition: opacity 0.15s;
	}
	.task-row:hover .remove-btn { opacity: 1; }

	.empty { padding: 2rem; text-align: center; color: var(--text-muted, #64748b); font-size: 0.85rem; }
	.empty-hint { margin-top: 0.5rem; font-size: 0.78rem; }
</style>
