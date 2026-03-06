import type {
	SolvePhaseState,
	SolveStep,
	SolveTrigger,
	TriggerQuestion,
	DiscoveredVendor,
	SolveConstraint,
	SolveStakeholder,
	SolvePriority,
	PriorityTier,
	KnockoutEntry,
	ChallengeQuestion,
	ChallengeResponse,
	Urgency,
} from '@shortlist/shared-types/project';
import { EMPTY_SOLVE_STATE } from '@shortlist/shared-types/project';

/**
 * SOLVE (Define) phase store using Svelte 5 runes.
 * Manages all state for the 7-step Define workflow.
 */
let state = $state<SolvePhaseState>({ ...EMPTY_SOLVE_STATE });
let loading = $state(false);
let saving = $state(false);
let dirty = $state(false);

export const solveStore = {
	// ─── Getters ─────────────────────────────────────────────
	get state() { return state; },
	get loading() { return loading; },
	get saving() { return saving; },
	get dirty() { return dirty; },
	get triggers() { return state.triggers; },
	get triggerQuestions() { return state.triggerQuestions; },
	get budgetRange() { return state.budgetRange; },
	get timeline() { return state.timeline; },
	get urgency() { return state.urgency; },
	get categoryDetected() { return state.categoryDetected; },
	get categoryConfidence() { return state.categoryConfidence; },
	get categoryAlternatives() { return state.categoryAlternatives; },
	get discoveredVendors() { return state.discoveredVendors; },
	get shortlistedVendorIds() { return state.shortlistedVendorIds; },
	get constraints() { return state.constraints; },
	get stakeholders() { return state.stakeholders; },
	get priorities() { return state.priorities; },
	get knockoutMatrix() { return state.knockoutMatrix; },
	get problemBrief() { return state.problemBrief; },
	get challengeQuestions() { return state.challengeQuestions; },
	get challengeResponses() { return state.challengeResponses; },
	get completedSteps() { return state.completedSteps; },

	get shortlistedVendors(): DiscoveredVendor[] {
		return state.discoveredVendors.filter(
			(v) => state.shortlistedVendorIds.includes(v.id)
		);
	},

	get allPriorities(): SolvePriority[] {
		return [
			...state.priorities.must_have,
			...state.priorities.nice_to_have,
			...state.priorities.bonus,
		];
	},

	// ─── Lifecycle ───────────────────────────────────────────

	/**
	 * Load SOLVE state from API response.
	 */
	load(data: SolvePhaseState) {
		state = { ...EMPTY_SOLVE_STATE, ...data };
		dirty = false;
	},

	/**
	 * Reset to empty state.
	 */
	clear() {
		state = { ...EMPTY_SOLVE_STATE };
		loading = false;
		saving = false;
		dirty = false;
	},

	setLoading(val: boolean) { loading = val; },
	setSaving(val: boolean) { saving = val; },

	// ─── Step 1: Triggers ────────────────────────────────────

	setTriggers(triggers: SolveTrigger[]) {
		state = { ...state, triggers };
		dirty = true;
	},

	toggleTrigger(triggerId: string) {
		state = {
			...state,
			triggers: state.triggers.map((t) =>
				t.id === triggerId ? { ...t, selected: !t.selected } : t
			),
		};
		dirty = true;
	},

	setTriggerQuestions(questions: TriggerQuestion[]) {
		state = { ...state, triggerQuestions: questions };
		dirty = true;
	},

	answerTriggerQuestion(questionId: string, answer: string) {
		state = {
			...state,
			triggerQuestions: state.triggerQuestions.map((q) =>
				q.id === questionId ? { ...q, answer } : q
			),
		};
		dirty = true;
	},

	setBudget(budgetRange: string | null) {
		state = { ...state, budgetRange };
		dirty = true;
	},

	setTimeline(timeline: string | null) {
		state = { ...state, timeline };
		dirty = true;
	},

	setUrgency(urgency: Urgency | null) {
		state = { ...state, urgency };
		dirty = true;
	},

	// ─── Step 2: Category Detection ─────────────────────────

	setCategory(detected: string, confidence: number, alternatives: { name: string; confidence: number }[]) {
		state = {
			...state,
			categoryDetected: detected,
			categoryConfidence: confidence,
			categoryAlternatives: alternatives,
		};
		dirty = true;
	},

	overrideCategory(category: string) {
		state = {
			...state,
			categoryDetected: category,
			categoryConfidence: 1.0,
		};
		dirty = true;
	},

	// ─── Step 3: Vendor Discovery ───────────────────────────

	setDiscoveredVendors(vendors: DiscoveredVendor[]) {
		state = { ...state, discoveredVendors: vendors };
		dirty = true;
	},

	swipeVendor(vendorId: string, direction: 'left' | 'right') {
		const updated = state.discoveredVendors.map((v) =>
			v.id === vendorId ? { ...v, swiped: direction } : v
		);
		const shortlisted = direction === 'right'
			? [...state.shortlistedVendorIds, vendorId]
			: state.shortlistedVendorIds.filter((id) => id !== vendorId);

		state = {
			...state,
			discoveredVendors: updated,
			shortlistedVendorIds: [...new Set(shortlisted)],
		};
		dirty = true;
	},

	removeShortlistedVendor(vendorId: string) {
		state = {
			...state,
			shortlistedVendorIds: state.shortlistedVendorIds.filter((id) => id !== vendorId),
			discoveredVendors: state.discoveredVendors.map((v) =>
				v.id === vendorId ? { ...v, swiped: null } : v
			),
		};
		dirty = true;
	},

	// ─── Step 4: Constraints & Stakeholders ─────────────────

	setConstraints(constraints: SolveConstraint[]) {
		state = { ...state, constraints };
		dirty = true;
	},

	addConstraint(constraint: SolveConstraint) {
		state = { ...state, constraints: [...state.constraints, constraint] };
		dirty = true;
	},

	removeConstraint(id: string) {
		state = { ...state, constraints: state.constraints.filter((c) => c.id !== id) };
		dirty = true;
	},

	setStakeholders(stakeholders: SolveStakeholder[]) {
		state = { ...state, stakeholders };
		dirty = true;
	},

	addStakeholder(stakeholder: SolveStakeholder) {
		state = { ...state, stakeholders: [...state.stakeholders, stakeholder] };
		dirty = true;
	},

	removeStakeholder(id: string) {
		state = { ...state, stakeholders: state.stakeholders.filter((s) => s.id !== id) };
		dirty = true;
	},

	// ─── Step 4b: Priorities ────────────────────────────────

	addPriority(tier: PriorityTier, priority: SolvePriority) {
		state = {
			...state,
			priorities: {
				...state.priorities,
				[tier]: [...state.priorities[tier], priority],
			},
		};
		dirty = true;
	},

	removePriority(tier: PriorityTier, id: string) {
		state = {
			...state,
			priorities: {
				...state.priorities,
				[tier]: state.priorities[tier].filter((p) => p.id !== id),
			},
		};
		dirty = true;
	},

	movePriority(id: string, fromTier: PriorityTier, toTier: PriorityTier) {
		const item = state.priorities[fromTier].find((p) => p.id === id);
		if (!item) return;
		state = {
			...state,
			priorities: {
				...state.priorities,
				[fromTier]: state.priorities[fromTier].filter((p) => p.id !== id),
				[toTier]: [...state.priorities[toTier], { ...item, tier: toTier }],
			},
		};
		dirty = true;
	},

	// ─── Step 5: Brief & Knockout ───────────────────────────

	setProblemBrief(brief: string) {
		state = {
			...state,
			problemBrief: brief,
			briefGeneratedAt: new Date().toISOString(),
		};
		dirty = true;
	},

	setKnockoutMatrix(entries: KnockoutEntry[]) {
		state = { ...state, knockoutMatrix: entries };
		dirty = true;
	},

	updateKnockoutEntry(vendorId: string, criterionId: string, pass: boolean | null) {
		const existing = state.knockoutMatrix.find(
			(e) => e.vendorId === vendorId && e.criterionId === criterionId
		);
		if (existing) {
			state = {
				...state,
				knockoutMatrix: state.knockoutMatrix.map((e) =>
					e.vendorId === vendorId && e.criterionId === criterionId
						? { ...e, pass }
						: e
				),
			};
		} else {
			state = {
				...state,
				knockoutMatrix: [...state.knockoutMatrix, { vendorId, criterionId, pass, notes: null }],
			};
		}
		dirty = true;
	},

	// ─── Step 6: Challenge/Validate ─────────────────────────

	setChallengeQuestions(questions: ChallengeQuestion[]) {
		state = { ...state, challengeQuestions: questions };
		dirty = true;
	},

	respondToChallenge(questionId: string, response: string, satisfactory: boolean | null) {
		const existing = state.challengeResponses.find((r) => r.questionId === questionId);
		if (existing) {
			state = {
				...state,
				challengeResponses: state.challengeResponses.map((r) =>
					r.questionId === questionId ? { ...r, response, satisfactory } : r
				),
			};
		} else {
			state = {
				...state,
				challengeResponses: [...state.challengeResponses, { questionId, response, satisfactory }],
			};
		}
		dirty = true;
	},

	// ─── Step Tracking ──────────────────────────────────────

	completeStep(step: SolveStep) {
		if (!state.completedSteps.includes(step)) {
			state = {
				...state,
				completedSteps: [...state.completedSteps, step],
			};
			dirty = true;
		}
	},

	isStepComplete(step: SolveStep): boolean {
		return state.completedSteps.includes(step);
	},

	// ─── Bulk Update ────────────────────────────────────────

	update(partial: Partial<SolvePhaseState>) {
		state = { ...state, ...partial };
		dirty = true;
	},

	markClean() {
		dirty = false;
	},
};
