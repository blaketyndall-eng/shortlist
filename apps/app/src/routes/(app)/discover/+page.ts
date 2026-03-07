import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const category = url.searchParams.get('category') ?? '';
	const search = url.searchParams.get('q') ?? '';
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const limit = 24;
	const offset = (page - 1) * limit;

	// Fetch categories
	const catRes = await fetch('/api/vendors/categories');
	const categories = catRes.ok ? await catRes.json() : [];

	// Fetch vendors
	const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
	if (category) params.set('category', category);
	if (search) params.set('q', search);

	const vendorRes = await fetch(`/api/vendors?${params}`);
	const vendorData = vendorRes.ok ? await vendorRes.json() : { vendors: [], total: 0 };

	return {
		categories,
		vendors: vendorData.vendors,
		total: vendorData.total,
		page,
		limit,
		category,
		search,
	};
};
