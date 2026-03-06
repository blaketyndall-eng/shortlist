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
	<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
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
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
					<path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
					<path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
					<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
				</svg>
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
		padding: 2rem;
		background: #0b1017;
		font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	.auth-logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: #ffffff;
		font-weight: 700;
		font-size: 1.125rem;
		margin-bottom: 2rem;
		justify-content: center;
	}

	.logo-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: linear-gradient(135deg, #00cc96, #4a96f8);
		color: white;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		background: #131a24;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 2.5rem;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 1.75rem;
	}

	.auth-header h1 {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
		color: #ffffff;
	}

	.auth-header p {
		color: #8b95a5;
		margin-bottom: 0;
	}

	.error-banner {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid rgba(220, 38, 38, 0.2);
		color: #f87171;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.success-banner {
		background: rgba(0, 204, 150, 0.1);
		border: 1px solid rgba(0, 204, 150, 0.2);
		color: #00cc96;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		font-size: 0.9375rem;
		text-align: center;
	}

	.field {
		display: block;
		margin-bottom: 1rem;
	}

	.field span {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.375rem;
		color: #c0c8d4;
	}

	.field input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		font-size: 0.9375rem;
		background: rgba(255, 255, 255, 0.04);
		color: #e0e6ed;
		font-family: inherit;
		transition: border-color 0.15s;
	}

	.field input::placeholder { color: #5a6472; }

	.field input:focus {
		outline: none;
		border-color: #00cc96;
		box-shadow: 0 0 0 3px rgba(0, 204, 150, 0.1);
	}

	.btn-primary {
		width: 100%;
		padding: 0.625rem 1.25rem;
		background: linear-gradient(135deg, #00cc96, #00b386);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: opacity 0.15s;
	}

	.btn-primary:hover:not(:disabled) { opacity: 0.9; }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 1.5rem 0;
		color: #5a6472;
		font-size: 0.8125rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.btn-oauth {
		width: 100%;
		padding: 0.625rem 1.25rem;
		background: rgba(255, 255, 255, 0.04);
		color: #c0c8d4;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.15s, background 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.btn-oauth:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.auth-footer {
		text-align: center;
		margin-top: 1.5rem;
		font-size: 0.875rem;
		color: #8b95a5;
	}

	.auth-footer a {
		color: #00cc96;
		text-decoration: none;
		font-weight: 500;
	}

	.auth-footer a:hover { text-decoration: underline; }
</style>
