<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let fullName = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	const supabase = createSupabaseBrowserClient();
	const redirectTo = $derived($page.url.searchParams.get('redirectTo') ?? '/dashboard');

	async function handleSignup() {
		loading = true;
		error = '';

		const { error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName
				},
				emailRedirectTo: `${$page.url.origin}/auth/callback`
			}
		});

		if (authError) {
			error = authError.message;
			loading = false;
			return;
		}

		success = true;
		loading = false;
	}

	async function handleGoogleSignup() {
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
	<title>Sign Up — Shortlist</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card">
		<a href="https://tryshortlist.app" class="auth-logo">
			<span class="logo-mark">S</span>
			<span>Shortlist</span>
		</a>
		<div class="auth-header">
			<h1>Create your account</h1>
			<p>Start your 14-day free trial</p>
		</div>

		{#if success}
			<div class="success-banner" role="status">
				Check your email for a confirmation link to complete your signup.
			</div>
		{:else}
			{#if error}
				<div class="error-banner" role="alert">{error}</div>
			{/if}

			<form onsubmit={handleSignup}>
				<label class="field">
					<span>Full name</span>
					<input
						type="text"
						bind:value={fullName}
						placeholder="Jane Smith"
						required
						autocomplete="name"
					/>
				</label>

				<label class="field">
					<span>Work email</span>
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
						placeholder="At least 8 characters"
						required
						minlength="8"
						autocomplete="new-password"
					/>
				</label>

				<button type="submit" class="btn-primary" disabled={loading}>
					{loading ? 'Creating account…' : 'Create account'}
				</button>
			</form>

			<div class="divider"><span>or</span></div>

			<button class="btn-oauth" onclick={handleGoogleSignup} disabled={loading}>
				Continue with Google
			</button>
		{/if}

		<p class="auth-footer">
			Already have an account? <a href="/auth/login{redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}">Log in</a>
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
		background: var(--neutral-50);
	}

	.auth-logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: var(--neutral-800);
		font-weight: 700;
		font-size: 1.125rem;
		margin-bottom: var(--space-5);
		justify-content: center;
	}

	.logo-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: var(--primary-600, #4f46e5);
		color: white;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		background: white;
		border-radius: var(--radius-lg);
		border: 1px solid var(--neutral-200);
		padding: var(--space-8);
	}

	.auth-header {
		text-align: center;
		margin-bottom: var(--space-6);
	}

	.auth-header h1 {
		font-size: 1.5rem;
		margin-bottom: var(--space-1);
	}

	.auth-header p {
		color: var(--neutral-500);
		margin-bottom: 0;
	}

	.error-banner {
		background: #fef2f2;
		color: #dc2626;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
		font-size: 0.875rem;
	}

	.success-banner {
		background: #f0fdf4;
		color: #16a34a;
		padding: var(--space-4);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-4);
		font-size: 0.9375rem;
		text-align: center;
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
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		transition: border-color var(--transition-fast);
	}

	.field input:focus {
		outline: var(--focus-ring);
		outline-offset: var(--focus-ring-offset);
		border-color: var(--primary-500);
	}

	.btn-primary {
		width: 100%;
		padding: var(--space-2) var(--space-4);
		background: var(--primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
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
		color: var(--neutral-400);
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
		background: white;
		color: var(--neutral-700);
		border: 1px solid var(--neutral-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.btn-oauth:hover:not(:disabled) {
		background: var(--neutral-50);
	}

	.auth-footer {
		text-align: center;
		margin-top: var(--space-5);
		font-size: 0.875rem;
		color: var(--neutral-500);
	}
</style>
