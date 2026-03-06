import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects/[id]/export — Generate an HTML report for PDF printing
 * Returns an HTML document styled for print that the client can window.print() or convert
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { data: project } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (!project) {
		error(404, 'Project not found');
	}

	// Verify membership
	const { data: membership } = await supabase
		.from('project_members')
		.select('role')
		.eq('project_id', params.id)
		.eq('user_id', locals.user.id)
		.single();

	if (!membership) {
		error(403, 'Not a project member');
	}

	const vendors = project.state?.vendors ?? [];
	const criteria = project.state?.criteria ?? [];
	const scores = project.state?.scores ?? {};

	// Calculate weighted scores
	const totalWeight = criteria.reduce((sum: number, c: any) => sum + (c.weight ?? 1), 0);
	const vendorResults = vendors.map((v: any, vi: number) => {
		const vendorScores = scores[vi] ?? {};
		let weighted = 0;
		criteria.forEach((c: any, ci: number) => {
			const score = vendorScores[ci] ?? 0;
			const normalizedWeight = (c.weight ?? 1) / totalWeight;
			weighted += score * normalizedWeight;
		});
		return { ...v, totalScore: weighted, scores: vendorScores };
	}).sort((a: any, b: any) => b.totalScore - a.totalScore);

	const winner = vendorResults[0];
	const date = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const html = `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>${project.name} — Evaluation Report</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
		h1 { font-size: 24px; margin-bottom: 4px; }
		h2 { font-size: 18px; margin: 32px 0 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
		h3 { font-size: 15px; margin: 16px 0 8px; }
		.subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
		.meta { display: flex; gap: 24px; font-size: 13px; color: #6b7280; margin-bottom: 32px; }
		.winner-box { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
		.winner-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #059669; font-weight: 600; }
		.winner-box .name { font-size: 20px; font-weight: 700; }
		.winner-box .score { font-size: 14px; color: #047857; }
		table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
		th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
		th { background: #f9fafb; font-weight: 600; color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
		.score-cell { text-align: center; font-weight: 600; }
		.high { color: #16a34a; }
		.mid { color: #ca8a04; }
		.low { color: #dc2626; }
		.rank { display: inline-block; width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; text-align: center; line-height: 24px; font-weight: 700; font-size: 12px; margin-right: 8px; }
		.rank-1 { background: #fef3c7; color: #92400e; }
		.rank-2 { background: #e5e7eb; color: #374151; }
		.rank-3 { background: #fed7aa; color: #9a3412; }
		.footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
		@media print {
			body { padding: 20px; }
			h2 { break-after: avoid; }
			table { break-inside: avoid; }
		}
	</style>
</head>
<body>
	<h1>${project.name}</h1>
	<p class="subtitle">Vendor Evaluation Report</p>
	<div class="meta">
		<span>Category: ${project.category ?? 'General'}</span>
		<span>Vendors: ${vendors.length}</span>
		<span>Criteria: ${criteria.length}</span>
		<span>Generated: ${date}</span>
	</div>

	${winner ? `
	<div class="winner-box">
		<div class="label">Recommended Vendor</div>
		<div class="name">${winner.name}</div>
		<div class="score">Weighted Score: ${winner.totalScore.toFixed(2)} / 10</div>
	</div>
	` : ''}

	<h2>Rankings</h2>
	<table>
		<thead>
			<tr>
				<th>Rank</th>
				<th>Vendor</th>
				<th>Weighted Score</th>
			</tr>
		</thead>
		<tbody>
			${vendorResults.map((v: any, i: number) => `
			<tr>
				<td><span class="rank rank-${i + 1}">${i + 1}</span></td>
				<td>${v.name}</td>
				<td class="score-cell ${v.totalScore >= 8 ? 'high' : v.totalScore >= 5 ? 'mid' : 'low'}">${v.totalScore.toFixed(2)}</td>
			</tr>
			`).join('')}
		</tbody>
	</table>

	<h2>Detailed Comparison</h2>
	<table>
		<thead>
			<tr>
				<th>Criterion</th>
				<th>Weight</th>
				${vendorResults.map((v: any) => `<th>${v.name}</th>`).join('')}
			</tr>
		</thead>
		<tbody>
			${criteria.map((c: any, ci: number) => `
			<tr>
				<td>${c.name}</td>
				<td>${c.weight ?? 1}</td>
				${vendorResults.map((v: any) => {
					const s = v.scores[ci] ?? 0;
					return `<td class="score-cell ${s >= 8 ? 'high' : s >= 5 ? 'mid' : 'low'}">${s}</td>`;
				}).join('')}
			</tr>
			`).join('')}
		</tbody>
	</table>

	<div class="footer">
		Generated by Shortlist — tryshortlist.app
	</div>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Disposition': `inline; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '-')}-report.html"`
		}
	});
};
