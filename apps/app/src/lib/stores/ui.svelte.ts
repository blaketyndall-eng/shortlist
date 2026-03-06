/**
 * UI state store using Svelte 5 runes.
 * Global UI concerns: toasts, modals, sidebar, loading states.
 */

interface Toast {
	id: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error';
	duration?: number;
}

let sidebarOpen = $state(true);
let toasts = $state<Toast[]>([]);
let globalLoading = $state(false);

export const uiStore = {
	get sidebarOpen() { return sidebarOpen; },
	get toasts() { return toasts; },
	get globalLoading() { return globalLoading; },

	toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	},

	setSidebar(open: boolean) {
		sidebarOpen = open;
	},

	/**
	 * Show a toast notification. Auto-dismisses after duration (default 4s).
	 */
	toast(message: string, type: Toast['type'] = 'info', duration = 4000) {
		const id = crypto.randomUUID();
		toasts = [...toasts, { id, message, type, duration }];

		if (duration > 0) {
			setTimeout(() => {
				toasts = toasts.filter((t) => t.id !== id);
			}, duration);
		}

		return id;
	},

	dismissToast(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	},

	setGlobalLoading(val: boolean) {
		globalLoading = val;
	}
};
