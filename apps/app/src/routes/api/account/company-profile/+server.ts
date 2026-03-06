import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerSupabase } from '$services/supabase.server';

/**
 * GET /api/account/company-profile
 * Get the user's company profile
 */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const supabase = createServerSupabase(cookies);

	// Company profile stored on user metadata or a dedicated table
	const { data: userData } = await supabase
		.from('profiles')
		.select('company_profile')
		.eq('id', locals.user.id)
		.single();

	return json({ profile: userData?.company_profile ?? null });
};

/**
 * POST /api/account/company-profile
 * Save the user's company profile
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.session || !locals.user) {
		error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { profile } = body;

	if (!profile) {
		error(400, 'Profile data is required');
	}

	const supabase = createServerSupabase(cookies);

	// Upsert: update if exists, insert if not
	const { error: upsertError } = await supabase
		.from('profiles')
		.upsert(
			{
				id: locals.user.id,
				company_profile: profile,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'id' }
		);

	if (upsertError) {
		error(500, `Failed to save profile: ${upsertError.message}`);
	}

	return json({ success: true });
};
