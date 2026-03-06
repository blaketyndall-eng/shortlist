import type { UserProfile, TeamRole } from '@shortlist/shared-types/auth';
import { hasPermission, type Permission } from '@shortlist/shared-types/auth';

/**
 * Reactive user store using Svelte 5 runes.
 * Populated from layout server data, updated on auth state changes.
 */
let profile = $state<UserProfile | null>(null);

export const userStore = {
	get profile() { return profile; },
	get isAuthenticated() { return profile !== null; },
	get role() { return profile?.role ?? null; },
	get fullName() { return profile?.full_name ?? null; },
	get email() { return profile?.email ?? ''; },
	get isOnboarded() { return profile?.onboarding_completed ?? false; },

	/**
	 * Check if the current user has a specific permission.
	 */
	can(permission: Permission): boolean {
		if (!profile?.role) return false;
		return hasPermission(profile.role, permission);
	},

	/**
	 * Set or update the user profile (called from layout data).
	 */
	set(newProfile: UserProfile | null) {
		profile = newProfile;
	},

	/**
	 * Clear user data on logout.
	 */
	clear() {
		profile = null;
	}
};
