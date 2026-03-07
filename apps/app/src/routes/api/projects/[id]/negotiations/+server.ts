import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const supabase = createServerSupabase(cookies);
	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('state')
		.eq('id', params.id)
		.single();

	if (dbError || !project) error(404, 'Project not found');

	return json({ entries: project.state?.negotiationEntries ?? [] });
};

export const POST: RequestHandler = async ({ params, request, locals, cookies, fetch: serverFetch }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	const { data: project, error: fetchError } = await supabase
		.from('projects')
		.select('state, category')
		.eq('id', params.id)
		.single();

	if (fetchError || !project) error(404, 'Project not found');

	const state = project.state ?? {};
	const oldEntries = state.negotiationEntries ?? [];
	const newEntries = body.entries ?? [];
	state.negotiationEntries = newEntries;

	// Auto-extract intelligence from new/changed entries
	if (newEntries.length > oldEntries.length) {
		const latestEntry = newEntries[newEntries.length - 1];
		if (latestEntry?.notes && latestEntry.notes.length > 20) {
			try {
				const aiRes = await serverFetch('/api/ai/engine', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						engine: 'negotiation_extract',
						projectId: params.id,
						depth: 'quick',
						context: {
							vendorName: latestEntry.vendorName ?? latestEntry.vendor ?? '',
							category: project.category ?? '',
							entryText: latestEntry.notes,
						},
					}),
				});

				if (aiRes.ok) {
					const result = await aiRes.json();
					const extracted = result.data ?? result.result ?? null;
					if (extracted) {
						// Attach intelligence to the entry
						state.negotiationEntries[newEntries.length - 1] = {
							...latestEntry,
							aiIntelligence: extracted,
						};
					}
				}
			} catch {
				// Non-critical — save without AI extraction
			}
		}
	}

	const { error: updateError } = await supabase
		.from('projects')
		.update({ state, updated_at: new Date().toISOString() })
		.eq('id', params.id);

	if (updateError) error(500, `Failed to save negotiations: ${updateError.message}`);

	return json({ ok: true });
};
