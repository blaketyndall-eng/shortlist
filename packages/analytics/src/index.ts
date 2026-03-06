import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics(apiKey: string, options?: { host?: string }) {
	if (initialized || typeof window === 'undefined') return;

	posthog.init(apiKey, {
		api_host: options?.host || 'https://us.i.posthog.com',
		capture_pageview: false, // We handle this manually for SPA
		persistence: 'localStorage',
		autocapture: false
	});

	initialized = true;
}

export function identify(userId: string, properties?: Record<string, unknown>) {
	if (!initialized) return;
	posthog.identify(userId, properties);
}

export function track(event: string, properties?: Record<string, unknown>) {
	if (!initialized) return;
	posthog.capture(event, properties);
}

export function pageview(path: string) {
	if (!initialized) return;
	posthog.capture('$pageview', { $current_url: path });
}

export function reset() {
	if (!initialized) return;
	posthog.reset();
}

// ─── SHORTLIST-SPECIFIC EVENTS ───────────────────────────────

export const events = {
	// Project
	projectCreated: (category: string) => track('project_created', { category }),
	projectCompleted: (vendorCount: number) => track('project_completed', { vendorCount }),
	wizardStepCompleted: (step: string) => track('wizard_step_completed', { step }),

	// AI
	aiChatSent: (engine: string) => track('ai_chat_sent', { engine }),
	aiResponseAccepted: (engine: string) => track('ai_response_accepted', { engine }),
	aiResponseModified: (engine: string) => track('ai_response_modified', { engine }),

	// Collaboration
	pollCreated: () => track('poll_created'),
	pollVoted: () => track('poll_voted'),
	commentAdded: (targetType: string) => track('comment_added', { targetType }),
	briefSubmitted: () => track('brief_submitted'),
	briefApproved: () => track('brief_approved'),

	// Vendor Portal
	portalRequestCreated: () => track('portal_request_created'),
	portalResponseReceived: () => track('portal_response_received'),

	// Export
	exportGenerated: (format: string) => track('export_generated', { format })
} as const;
