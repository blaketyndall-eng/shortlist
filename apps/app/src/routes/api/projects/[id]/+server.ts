import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/projects/[id] — Get a single project
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { data: project, error: dbError } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError || !project) {
		error(404, 'Project not found');
	}

	return json({ project });
};

/**
 * PATCH /api/projects/[id] — Update a project
 */
export const PATCH: RequestHandler = async ({ params, request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const supabase = createServerSupabase(cookies);

	// Only allow specific fields to be updated
	const allowedFields = ['name', 'description', 'category', 'status', 'current_step', 'state'];
	const updates: Record<string, unknown> = {};

	for (const field of allowedFields) {
		if (body[field] !== undefined) {
			updates[field] = body[field];
		}
	}

	updates.updated_at = new Date().toISOString();

	const { data: project, error: dbError } = await supabase
		.from('projects')
		.update(updates)
		.eq('id', params.id)
		.select()
		.single();

	if (dbError) {
		error(500, dbError.message);
	}

	return json({ project });
};

/**
 * DELETE /api/projects/[id] — Archive a project (soft delete)
 */
export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { error: dbError } = await supabase
		.from('projects')
		.update({ status: 'archived', updated_at: new Date().toISOString() })
		.eq('id', params.id);

	if (dbError) {
		error(500, dbError.message);
	}

	return json({ success: true });
};
