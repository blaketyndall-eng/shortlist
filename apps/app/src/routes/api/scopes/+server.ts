import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const { data, error: err } = await locals.supabase
		.from('scopes')
		.select('*')
		.eq('user_id', locals.user.id)
		.order('created_at', { ascending: false });

	if (err) error(500, err.message);
	return json(data ?? []);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session || !locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	if (!body.name?.trim()) error(400, 'Name is required');

	const { data, error: err } = await locals.supabase
		.from('scopes')
		.insert({
			user_id: locals.user.id,
			name: body.name.trim(),
			status: 'active',
			current_step: 'signal',
			data: {},
		})
		.select()
		.single();

	if (err) error(500, err.message);
	return json(data, { status: 201 });
};
