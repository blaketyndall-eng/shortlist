import type { Criterion, ProjectVendor } from '@shortlist/shared-types/project';

/**
 * Scoring Service — handles weighted scoring calculations.
 * Pure functions, no side effects. Used by both client and server.
 */

export interface WeightedScore {
	vendorId: string;
	vendorName: string;
	totalScore: number;
	maxPossible: number;
	percentage: number;
	breakdown: CriterionScore[];
}

export interface CriterionScore {
	criterionId: string;
	criterionName: string;
	category: string;
	weight: number;
	rawScore: number;
	weightedScore: number;
}

/**
 * Calculate weighted scores for all vendors in a project.
 */
export function calculateWeightedScores(
	vendors: ProjectVendor[],
	criteria: Criterion[],
	weights: Record<string, number>,
	scores: Record<string, Record<string, number>>
): WeightedScore[] {
	const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

	return vendors.map((vendor) => {
		const vendorScores = scores[vendor.id] ?? {};
		const breakdown: CriterionScore[] = criteria.map((criterion) => {
			const weight = weights[criterion.id] ?? criterion.weight;
			const rawScore = vendorScores[criterion.id] ?? 0;
			const normalizedWeight = totalWeight > 0 ? weight / totalWeight : 0;
			const weightedScore = rawScore * normalizedWeight;

			return {
				criterionId: criterion.id,
				criterionName: criterion.name,
				category: criterion.category,
				weight,
				rawScore,
				weightedScore
			};
		});

		const totalScore = breakdown.reduce((sum, b) => sum + b.weightedScore, 0);
		const maxPossible = 10; // Scores are 0-10

		return {
			vendorId: vendor.id,
			vendorName: vendor.name,
			totalScore,
			maxPossible,
			percentage: maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0,
			breakdown
		};
	}).sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Calculate the rank difference between two scoring snapshots.
 */
export function calculateRankChanges(
	current: WeightedScore[],
	previous: WeightedScore[]
): Map<string, number> {
	const changes = new Map<string, number>();
	const prevRank = new Map(previous.map((v, i) => [v.vendorId, i + 1]));

	current.forEach((v, i) => {
		const currentRank = i + 1;
		const previousRank = prevRank.get(v.vendorId) ?? currentRank;
		changes.set(v.vendorId, previousRank - currentRank); // positive = moved up
	});

	return changes;
}
