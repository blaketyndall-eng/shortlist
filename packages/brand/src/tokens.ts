// ─── BRAND TOKENS (TypeScript) ───────────────────────────────
// Use these when you need tokens in JS/TS (e.g., charts, dynamic styles).
// For CSS, import tokens.css instead.

export const colors = {
	primary: '#2563eb',
	primaryHover: '#1d4ed8',
	primaryLight: '#dbeafe',
	primaryDark: '#1e40af',
	secondary: '#7c3aed',
	secondaryHover: '#6d28d9',
	secondaryLight: '#ede9fe',
	accent: '#06b6d4',
	success: '#16a34a',
	warning: '#d97706',
	danger: '#dc2626',
	info: '#2563eb',
	confidence: {
		veryHigh: '#16a34a',
		high: '#65a30d',
		moderate: '#d97706',
		low: '#ea580c',
		insufficient: '#dc2626'
	}
} as const;

export const fonts = {
	sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
	mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace"
} as const;

export const breakpoints = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px'
} as const;
