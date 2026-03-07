import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, parent }) => {
	const { supabase } = await parent();
	const idsParam = url.searchParams.get('ids') ?? '';
	const ids = idsParam.split(',').filter(Boolean);

	if (ids.length === 0) {
		return { vendors: [], error: 'No vendor IDs provided' };
	}

	const { data: vendors, error } = await supabase
		.from('vendor_library')
		.select('*')
		.in('id', ids);

	if (error) {
		return { vendors: [], error: error.message };
	}

	// Also try slug-based lookup as fallback
	if (!vendors?.length) {
		const { data: bySlug } = await supabase
			.from('vendor_library')
			.select('*')
			.in('slug', ids);

		return { vendors: bySlug ?? [], error: null };
	}

	return { vendors: vendors ?? [], error: null };
};
