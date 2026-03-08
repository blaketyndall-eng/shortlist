import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getSmartDefaults } from '$lib/services/smart-defaults';

export const POST = async ({ request, locals }: RequestEvent) => {
	const supabase = locals.supabase;
	if (!supabase) {
		return json({ hasPastData: false }, { status: 401 });
	}

	const body = await request.json();
	const category = body.category ?? '';

	// Get company profile for context
	let companyProfile = null;
	try {
		const { data: profile } = await supabase
			.from('company_profiles')
			.select('*')
			.limit(1)
			.single();
		companyProfile = profile;
	} catch { /* no profile */ }

	const defaults = await getSmartDefaults(category, companyProfile, supabase);
	return json(defaults);
};
