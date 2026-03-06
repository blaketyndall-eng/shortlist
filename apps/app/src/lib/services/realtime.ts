import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime Service — manages Supabase Realtime subscriptions
 * for collaboration features (comments, scores, notifications).
 */

type ChangeHandler = (payload: any) => void;

interface SubscriptionConfig {
	table: string;
	filter?: string;
	event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
	onInsert?: ChangeHandler;
	onUpdate?: ChangeHandler;
	onDelete?: ChangeHandler;
}

let channels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to changes on a table, scoped to a project.
 */
export function subscribeToProject(
	supabase: SupabaseClient,
	projectId: string,
	configs: SubscriptionConfig[]
): () => void {
	const channelName = `project:${projectId}`;

	// Unsubscribe existing if any
	const existing = channels.get(channelName);
	if (existing) {
		supabase.removeChannel(existing);
	}

	let channel = supabase.channel(channelName);

	for (const config of configs) {
		const filter = config.filter ?? `project_id=eq.${projectId}`;

		channel = channel.on(
			'postgres_changes',
			{
				event: config.event ?? '*',
				schema: 'public',
				table: config.table,
				filter
			},
			(payload) => {
				if (payload.eventType === 'INSERT' && config.onInsert) {
					config.onInsert(payload);
				} else if (payload.eventType === 'UPDATE' && config.onUpdate) {
					config.onUpdate(payload);
				} else if (payload.eventType === 'DELETE' && config.onDelete) {
					config.onDelete(payload);
				}
			}
		);
	}

	channel.subscribe();
	channels.set(channelName, channel);

	// Return cleanup function
	return () => {
		supabase.removeChannel(channel);
		channels.delete(channelName);
	};
}

/**
 * Subscribe to user-specific notifications.
 */
export function subscribeToNotifications(
	supabase: SupabaseClient,
	userId: string,
	onNotification: (notification: any) => void
): () => void {
	const channelName = `notifications:${userId}`;

	const existing = channels.get(channelName);
	if (existing) {
		supabase.removeChannel(existing);
	}

	const channel = supabase
		.channel(channelName)
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'notifications',
				filter: `user_id=eq.${userId}`
			},
			(payload) => {
				onNotification(payload.new);
			}
		)
		.subscribe();

	channels.set(channelName, channel);

	return () => {
		supabase.removeChannel(channel);
		channels.delete(channelName);
	};
}

/**
 * Clean up all active subscriptions.
 */
export function unsubscribeAll(supabase: SupabaseClient) {
	for (const [name, channel] of channels) {
		supabase.removeChannel(channel);
	}
	channels.clear();
}
