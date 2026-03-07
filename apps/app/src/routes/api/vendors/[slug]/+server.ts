import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/vendors/[slug] — Get a single vendor by slug
 */
export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	const { data: vendor, error: err } = await supabase
		.from('vendor_library')
		.select('*')
		.eq('slug', params.slug)
		.maybeSingle();

	if (err) {
		error(500, err.message);
	}

	if (!vendor) {
		error(404, 'Vendor not found');
	}

	return json(vendor);
};
