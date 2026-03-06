import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { UserProfile, TeamRole } from '@shortlist/shared-types/auth';

// ── Supabase Auth Hook ──────────────────────────────────────
const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' } as any);
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

// ── Auth Guard Hook ─────────────────────────────────────────
const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Load user profile if authenticated
	if (user) {
		const { data: profile } = await event.locals.supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single();

		event.locals.profile = (profile as UserProfile) ?? null;
		event.locals.role = (profile?.role as TeamRole) ?? null;
	} else {
		event.locals.profile = null;
		event.locals.role = null;
	}

	// Protected routes: redirect unauthenticated users
	const protectedPaths = ['/(app)'];
	const isProtected = protectedPaths.some((p) => event.url.pathname.startsWith(p.replace('(', '').replace(')', '')));

	// SvelteKit group routes: the (app) group means URLs don't include "(app)"
	// So we check for paths that need auth: /project, /account, /compare, /dashboard
	const authRequiredPaths = ['/project', '/projects', '/account', '/compare', '/dashboard', '/onboarding', '/discover'];
	const needsAuth = authRequiredPaths.some((p) => event.url.pathname.startsWith(p));

	if (needsAuth && !session) {
		const redirectTo = event.url.pathname + event.url.search;
		redirect(303, `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// Redirect authenticated users away from auth pages
	if (session && event.url.pathname.startsWith('/auth')) {
		redirect(303, '/dashboard');
	}

	return resolve(event);
};

// ── Security Headers Hook ───────────────────────────────────
const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};

export const handle = sequence(supabaseHandle, authGuard, securityHeaders);
