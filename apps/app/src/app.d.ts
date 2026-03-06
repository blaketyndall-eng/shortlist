import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, TeamRole } from '@shortlist/shared-types/auth';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{
				session: Session | null;
				user: import('@supabase/supabase-js').User | null;
			}>;
			session: Session | null;
			user: import('@supabase/supabase-js').User | null;
			profile: UserProfile | null;
			role: TeamRole | null;
		}

		interface PageData {
			session: Session | null;
			profile: UserProfile | null;
		}

		// interface Error {}
		// interface Platform {}
	}
}

export {};
