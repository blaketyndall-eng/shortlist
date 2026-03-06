<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	const supabase = createSupabaseBrowserClient();
	const redirectTo = $derived($page.url.searchParams.get('redirectTo') ?? '/dashboard');

	async function handleLogin() {
		loading = true;
		error = '';

		const { error: authError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (authError) {
			error = authError.message;
			loading = false;
			return;
		}

		goto(redirectTo);
	}

	async function handleGoogleLogin() {
		loading = true;
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${$page.url.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
			}
		});

		if (authError) {
			error = authError.message;
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Log In — Shortlist</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card">
		<div class="auth-header">
			<span class="auth-logo">Short<em>list</em></span>
			<h1>Welcome back</h1>
			<p>Log in to your Shortlist account</p>
		</div>

		{#if error}
			<div class="error-banner" role="alert">{error}</div>
		{/if}

		<form onsubmit={handleLogin}>
			<label class="field">
				<span>Email</span>
				<input
					type="email"
					bind:value={email}
					placeholder="you@company.com"
					required
					autocomplete="email"
				/>
			</label>

			<label class="field">
				<span>Password</span>
				<input
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
					autocomplete="current-password"
				/>
			</label>

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Logging in…' : 'Log in'}
			</button>
		</form>

		<div class="divider"><span>or</span></div>

		<button class="btn-oauth" onclick={handleGoogleLogin} disabled={loading}>
			Continue with Google
		</button>

		<p class="auth-footer">
			Don't have an account? <a href="/auth/signup">Sign up</a>
		</p>
	</div>
</div>

<style>
	.auth-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-4);
		background: var(--color-bg);
	}

	.auth-card {
		width: 100%;
		max-width: 420px;
		background: var(--neutral-100);
		border-radius: var(--radius-xl);
		border: 1px solid var(--neutral-200);
		padding: var(--space-8);
	}

	.auth-header {
		text-align: center;
		margin-bottom: var(--space-6);
	}

	.auth-logo {
		display: inline-block;
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--neutral-900);
		margin-bottom: var(--space-4);
	}

	.auth-logo em {
		color: var(--primary-500);
		font-family: var(--font-display);
		font-style: normal;
	}

	.auth-header h1 {
		font-size: 1.5rem;
		margin-bottom: var(--space-1);
		color: var(--neutral-900);
	}

	.auth-header p {
		color: var(--neutral-500);
		margin-bottom: 0;
	}

	.error-banner {
		background: var(--color-danger-light);
		color: var(--color-danger);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
		font-size: 0.875rem;
	}

	.field {
		display: block;
		margin-bottom: var(--space-4);
	}

	.field span {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: var(--space-1);
		color: var(--neutral-700);
	}

	.field input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		color: var(--neutral-900);
		transition: border-color var(--transition-fast);
	}

	.field input::placeholder {
		color: var(--neutral-500);
	}

	.field input:focus {
		outline: none;
		border-color: var(--primary-500);
		box-shadow: 0 0 0 2px rgba(0, 204, 150, 0.2);
	}

	.btn-primary {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: var(--primary-600);
		color: var(--color-text-inverse);
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-700);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: var(--space-5) 0;
		color: var(--neutral-500);
		font-size: 0.8125rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--neutral-200);
	}

	.btn-oauth {
		width: 100%;
		padding: var(--space-2) var(--space-4);
		background: transparent;
		color: var(--neutral-700);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-oauth:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
		border-color: var(--neutral-400);
	}

	.auth-footer {
		text-align: center;
		margin-top: var(--space-5);
		font-size: 0.875rem;
		color: var(--neutral-500);
	}

	.auth-footer a {
		color: var(--primary-500);
	}

	.auth-footer a:hover {
		color: var(--primary-400);
	}
</style>
