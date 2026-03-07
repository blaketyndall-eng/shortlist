import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/vendors?q=${params.slug}&limit=1`);

	if (!res.ok) {
		error(404, 'Vendor not found');
	}

	const data = await res.json();
	const vendor = data.vendors?.find((v: any) => v.slug === params.slug);

	if (!vendor) {
		error(404, 'Vendor not found');
	}

	// Load full vendor data with all fields
	const fullRes = await fetch(`/api/vendors/${params.slug}`);
	const fullVendor = fullRes.ok ? await fullRes.json() : vendor;

	// Load category info
	const catRes = await fetch('/api/vendors/categories');
	const categories = catRes.ok ? await catRes.json() : [];
	const category = categories.find((c: any) => c.slug === fullVendor.category_id);

	return {
		vendor: fullVendor,
		category,
	};
};
