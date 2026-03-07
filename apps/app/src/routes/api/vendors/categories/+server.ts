import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/vendors/categories — List all vendor categories
 */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { data, error: err } = await supabase
		.from('vendor_categories')
		.select('*')
		.order('name');

	if (err) {
		error(500, err.message);
	}

	return json(data ?? []);
};
