import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	// Fetch full profile
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.single();

	// Fetch notification preferences
	const { data: notifPrefs } = await locals.supabase
		.from('notification_preferences')
		.select('*')
		.eq('user_id', userId)
		.single();

	// Fetch teams the user belongs to
	const { data: teams } = await locals.supabase
		.from('team_members')
		.select(`
			role,
			teams(id, name, slug)
		`)
		.eq('user_id', userId);

	// Fetch AI usage this month
	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	const { data: usage } = await locals.supabase
		.from('ai_usage')
		.select('credits_used, engine, created_at')
		.eq('user_id', userId)
		.gte('created_at', startOfMonth.toISOString())
		.order('created_at', { ascending: false });

	const totalCredits = usage?.reduce((sum, row) => sum + (row.credits_used ?? 0), 0) ?? 0;

	return {
		profile: profile ?? null,
		notificationPreferences: notifPrefs ?? {
			email_digest: true,
			in_app: true,
			ai_updates: true,
			team_activity: true
		},
		teams: teams ?? [],
		aiUsage: {
			totalCredits,
			breakdown: usage ?? []
		}
	};
};
