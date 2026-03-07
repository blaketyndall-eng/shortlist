/**
 * Smart Defaults Service
 * Queries past completed projects to suggest criteria, constraints,
 * priorities, and vendor candidates for new projects.
 */

interface SmartDefaultsResult {
	hasPastData: boolean;
	pastProjectCount: number;
	criteria: Array<{ name: string; frequency: number }>;
	constraints: Array<{ description: string; frequency: number; hardLimit: boolean }>;
	priorities: { must_have: string[]; nice_to_have: string[] };
	frequentVendors: Array<{ name: string; count: number }>;
	summary: string;
}

/**
 * Load patterns from past projects matching a category/profile.
 */
export async function getSmartDefaults(
	category: string,
	companyProfile: Record<string, unknown> | null,
	supabase: any
): Promise<SmartDefaultsResult> {
	const empty: SmartDefaultsResult = {
		hasPastData: false,
		pastProjectCount: 0,
		criteria: [],
		constraints: [],
		priorities: { must_have: [], nice_to_have: [] },
		frequentVendors: [],
		summary: '',
	};

	try {
		// Query completed projects in same category
		const query = supabase
			.from('projects')
			.select('name, category, state, solve_data, status')
			.eq('status', 'completed');

		// Filter by category if available
		if (category) {
			query.eq('category', category);
		}

		const { data: pastProjects } = await query.limit(10);

		if (!pastProjects || pastProjects.length === 0) {
			return empty;
		}

		// Extract patterns
		const criteriaMap = new Map<string, number>();
		const constraintMap = new Map<string, { count: number; hardLimit: boolean }>();
		const priorityMust = new Map<string, number>();
		const priorityNice = new Map<string, number>();
		const vendorMap = new Map<string, number>();

		for (const proj of pastProjects) {
			const state = (proj.state ?? {}) as Record<string, unknown>;
			const solve = (proj.solve_data ?? {}) as Record<string, unknown>;

			// Criteria
			const criteria = Array.isArray(state.criteria) ? state.criteria : [];
			for (const c of criteria) {
				const crit = c as Record<string, unknown>;
				const name = String(crit.name ?? '');
				if (name) criteriaMap.set(name, (criteriaMap.get(name) ?? 0) + 1);
			}

			// Constraints from solve
			const constraints = Array.isArray(solve.constraints) ? solve.constraints : [];
			for (const con of constraints) {
				const constraint = con as Record<string, unknown>;
				const desc = String(constraint.description ?? '');
				if (desc) {
					const existing = constraintMap.get(desc) ?? { count: 0, hardLimit: false };
					constraintMap.set(desc, {
						count: existing.count + 1,
						hardLimit: existing.hardLimit || Boolean(constraint.hardLimit),
					});
				}
			}

			// Priorities
			const priorities = solve.priorities as Record<string, unknown[]> | undefined;
			if (priorities) {
				const must = Array.isArray(priorities.must_have) ? priorities.must_have : [];
				for (const p of must) {
					const label = String((p as Record<string, unknown>).label ?? '');
					if (label) priorityMust.set(label, (priorityMust.get(label) ?? 0) + 1);
				}
				const nice = Array.isArray(priorities.nice_to_have) ? priorities.nice_to_have : [];
				for (const p of nice) {
					const label = String((p as Record<string, unknown>).label ?? '');
					if (label) priorityNice.set(label, (priorityNice.get(label) ?? 0) + 1);
				}
			}

			// Vendors selected (from completion or shortlist)
			const vendors = Array.isArray(state.vendors) ? state.vendors : [];
			for (const v of vendors) {
				const name = String((v as Record<string, unknown>).name ?? '');
				if (name) vendorMap.set(name, (vendorMap.get(name) ?? 0) + 1);
			}
		}

		// Sort by frequency
		const sortedCriteria = [...criteriaMap.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([name, frequency]) => ({ name, frequency }));

		const sortedConstraints = [...constraintMap.entries()]
			.sort((a, b) => b[1].count - a[1].count)
			.slice(0, 5)
			.map(([description, { count, hardLimit }]) => ({ description, frequency: count, hardLimit }));

		const sortedMust = [...priorityMust.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
		const sortedNice = [...priorityNice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);

		const sortedVendors = [...vendorMap.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([name, count]) => ({ name, count }));

		const summary = `Based on ${pastProjects.length} past ${category || ''} evaluation${pastProjects.length > 1 ? 's' : ''}, here are patterns that may help you get started faster.`;

		return {
			hasPastData: true,
			pastProjectCount: pastProjects.length,
			criteria: sortedCriteria,
			constraints: sortedConstraints,
			priorities: { must_have: sortedMust, nice_to_have: sortedNice },
			frequentVendors: sortedVendors,
			summary,
		};
	} catch {
		return empty;
	}
}
