import type { Project, WizardStep, ProjectPhase, SolvePhaseState } from '@shortlist/shared-types/project';
import { EMPTY_SOLVE_STATE, SOLVE_STEPS, EVALUATE_STEPS } from '@shortlist/shared-types/project';

/**
 * Active project store using Svelte 5 runes.
 * Manages the currently-open project, wizard state, and phase tracking.
 */
let current = $state<Project | null>(null);
let projects = $state<Project[]>([]);
let loading = $state(false);

export const projectStore = {
	get current() { return current; },
	get projects() { return projects; },
	get loading() { return loading; },
	get currentStep() { return current?.currentStep ?? 'triggers'; },
	get phase() { return current?.phase ?? 'define'; },
	get solveData() { return current?.solveData ?? EMPTY_SOLVE_STATE; },

	/**
	 * Whether the project is in the Define (SOLVE) phase.
	 */
	get isDefinePhase() { return current?.phase === 'define'; },

	/**
	 * Whether the project is in the Evaluate phase.
	 */
	get isEvaluatePhase() { return current?.phase === 'evaluate'; },

	/**
	 * Whether the project is complete.
	 */
	get isComplete() { return current?.phase === 'complete'; },

	/**
	 * Get the steps for the current phase.
	 */
	get currentPhaseSteps() {
		if (!current) return SOLVE_STEPS;
		return current.phase === 'define' ? SOLVE_STEPS : EVALUATE_STEPS;
	},

	/**
	 * Get the index of the current step within the active phase.
	 */
	get currentStepIndex() {
		const steps = this.currentPhaseSteps;
		return Math.max(0, steps.findIndex((s) => s.key === current?.currentStep));
	},

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
	 * Transition the project to a new phase.
	 */
	setPhase(phase: ProjectPhase) {
		if (current) {
			const defaultStep: WizardStep = phase === 'define' ? 'triggers' : 'discovery';
			current = {
				...current,
				phase,
				currentStep: phase === 'complete' ? current.currentStep : defaultStep,
			};
		}
	},

	/**
	 * Transition from Define → Evaluate phase.
	 * Carries shortlisted vendors forward as project vendors.
	 */
	advanceToEvaluate() {
		if (current && current.phase === 'define') {
			current = {
				...current,
				phase: 'evaluate',
				currentStep: 'discovery',
			};
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

	/**
	 * Update SOLVE phase data on the project.
	 */
	updateSolveData(partial: Partial<SolvePhaseState>) {
		if (current) {
			current = {
				...current,
				solveData: { ...current.solveData, ...partial },
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
