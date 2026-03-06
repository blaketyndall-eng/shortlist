import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';

/**
 * Create a Supabase server client with cookie-based auth (for SSR pages).
 * Runs with the authenticated user's RLS context.
 */
export function createServerSupabase(cookies: Cookies) {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' } as any);
				});
			}
		}
	});
}

/**
 * Create a Supabase admin client with service role key.
 * Bypasses RLS — use ONLY for server-side operations like
 * vendor portal updates, system tasks, and background jobs.
 */
export function createAdminSupabase() {
	return createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		cookies: {
			getAll: () => [],
			setAll: () => {}
		}
	});
}
