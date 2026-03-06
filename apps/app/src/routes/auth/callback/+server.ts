import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const redirectTo = url.searchParams.get('redirectTo') ?? '/dashboard';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			redirect(303, redirectTo);
		}
	}

	// Auth failed — redirect to login with error
	redirect(303, '/auth/login?error=auth_callback_failed');
};
