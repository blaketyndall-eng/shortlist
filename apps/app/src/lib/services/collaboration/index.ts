import type { Poll, PollResponse, InlineComment, Notification } from '@shortlist/shared-types/collaboration';

/**
 * Collaboration Service — client-side helpers for polls, comments, notifications.
 * Actual CRUD goes through Supabase client; this provides typed wrappers.
 */

export interface CreatePollInput {
	projectId: string;
	question: string;
	options: string[];
	expiresAt?: string;
}

export interface CreateCommentInput {
	projectId: string;
	targetType: InlineComment['targetType'];
	targetId: string;
	content: string;
	parentId?: string;
}

/**
 * Create a new poll via the Supabase client.
 */
export async function createPoll(
	supabase: any,
	input: CreatePollInput
): Promise<Poll> {
	const { data, error } = await supabase
		.from('polls')
		.insert({
			project_id: input.projectId,
			question: input.question,
			options: input.options.map((text, i) => ({
				id: crypto.randomUUID(),
				text,
				order: i
			})),
			expires_at: input.expiresAt ?? null,
			status: 'active'
		})
		.select()
		.single();

	if (error) throw new Error(`Failed to create poll: ${error.message}`);
	return data;
}

/**
 * Submit a poll vote.
 */
export async function votePoll(
	supabase: any,
	pollId: string,
	optionId: string,
	userId: string
): Promise<PollResponse> {
	const { data, error } = await supabase
		.from('poll_responses')
		.upsert({
			poll_id: pollId,
			user_id: userId,
			option_id: optionId,
			responded_at: new Date().toISOString()
		}, { onConflict: 'poll_id,user_id' })
		.select()
		.single();

	if (error) throw new Error(`Failed to vote: ${error.message}`);
	return data;
}

/**
 * Add an inline comment.
 */
export async function addComment(
	supabase: any,
	userId: string,
	input: CreateCommentInput
): Promise<InlineComment> {
	const { data, error } = await supabase
		.from('inline_comments')
		.insert({
			project_id: input.projectId,
			user_id: userId,
			target_type: input.targetType,
			target_id: input.targetId,
			content: input.content,
			parent_id: input.parentId ?? null
		})
		.select()
		.single();

	if (error) throw new Error(`Failed to add comment: ${error.message}`);
	return data;
}

/**
 * Fetch unread notifications for the current user.
 */
export async function getUnreadNotifications(
	supabase: any,
	userId: string
): Promise<Notification[]> {
	const { data, error } = await supabase
		.from('notifications')
		.select('*')
		.eq('user_id', userId)
		.eq('read', false)
		.order('created_at', { ascending: false })
		.limit(50);

	if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
	return data ?? [];
}
