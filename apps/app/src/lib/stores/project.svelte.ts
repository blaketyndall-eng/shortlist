import type { Project, WizardStep } from '@shortlist/shared-types/project';

/**
 * Active project store using Svelte 5 runes.
 * Manages the currently-open project and wizard state.
 */
let current = $state<Project | null>(null);
let projects = $state<Project[]>([]);
let loading = $state(false);

export const projectStore = {
	get current() { return current; },
	get projects() { return projects; },
	get loading() { return loading; },
	get currentStep() { return current?.currentStep ?? 'discovery'; },

	/**
	 * Set the active project (when navigating to a project).
	 */
	setCurrent(project: Project | null) {
		current = project;
	},

	/**
	 * Set the list of projects (from API fetch).
	 */
	setProjects(list: Project[]) {
		projects = list;
	},

	/**
	 * Update the wizard step for the active project.
	 */
	setStep(step: WizardStep) {
		if (current) {
			current = { ...current, currentStep: step };
		}
	},

	/**
	 * Update project state (vendors, criteria, weights, scores).
	 */
	updateState(partial: Partial<Project['state']>) {
		if (current) {
			current = {
				...current,
				state: { ...current.state, ...partial }
			};
		}
	},

	setLoading(val: boolean) {
		loading = val;
	},

	clear() {
		current = null;
		projects = [];
		loading = false;
	}
};
