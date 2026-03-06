<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { page } from '$app/stores';

	let email = $state('');
	let password = $state('');
	let fullName = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	const supabase = createSupabaseBrowserClient();

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
				redirectTo: `${$page.url.origin}/auth/callback`
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
		<div class="auth-header">
			<span class="auth-logo">Short<em>list</em></span>
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
			Already have an account? <a href="/auth/login">Log in</a>
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
		background: var(--bg);
	}

	.auth-card {
		width: 100%;
		max-width: 420px;
		background: var(--s1);
		border-radius: 14px;
		border: 1px solid var(--b);
		padding: var(--space-8);
	}

	.auth-header {
		text-align: center;
		margin-bottom: var(--space-6);
	}

	.auth-logo {
		display: inline-block;
		font-family: var(--font-display);
		font-size: 19px;
		font-weight: 700;
		color: var(--tx);
		margin-bottom: var(--space-4);
	}

	.auth-logo em {
		color: var(--t);
		font-style: normal;
	}

	.auth-header h1 {
		font-size: 1.5rem;
		margin-bottom: var(--space-1);
		color: var(--tx);
	}

	.auth-header p {
		color: var(--mu);
		margin-bottom: 0;
		font-size: 14px;
	}

	.error-banner {
		background: rgba(240, 80, 80, 0.12);
		color: var(--rd);
		padding: var(--space-3);
		border-radius: 8px;
		border: 1px solid rgba(240, 80, 80, 0.2);
		margin-bottom: var(--space-4);
		font-size: 13px;
	}

	.success-banner {
		background: rgba(0, 204, 150, 0.12);
		color: var(--t);
		padding: var(--space-4);
		border-radius: 8px;
		border: 1px solid rgba(0, 204, 150, 0.2);
		margin-bottom: var(--space-4);
		font-size: 14px;
		text-align: center;
	}

	.field {
		display: block;
		margin-bottom: 14px;
	}

	.field span {
		display: block;
		font-size: 11px;
		font-weight: 700;
		color: var(--mu);
		letter-spacing: 0.5px;
		margin-bottom: 5px;
	}

	.field input {
		width: 100%;
		padding: 9px 13px;
		background: var(--s2);
		border: 1px solid var(--b2);
		border-radius: 8px;
		font-size: 13px;
		color: var(--tx);
		font-family: var(--font-sans);
		transition: border-color 150ms ease;
		outline: none;
	}

	.field input::placeholder {
		color: var(--mu2);
	}

	.field input:focus {
		border-color: var(--t);
	}

	.btn-primary {
		width: 100%;
		padding: 11px 20px;
		background: var(--t);
		color: #061510;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		font-family: var(--font-sans);
		cursor: pointer;
		transition: all 170ms ease;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--t2);
		transform: translateY(-1px);
		box-shadow: 0 8px 22px rgba(0, 204, 150, 0.22);
	}

	.btn-primary:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: var(--space-5) 0;
		color: var(--mu2);
		font-size: 12px;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--b);
	}

	.btn-oauth {
		width: 100%;
		padding: 10px 20px;
		background: transparent;
		color: var(--tx);
		border: 1px solid var(--b2);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		font-family: var(--font-sans);
		cursor: pointer;
		transition: all 170ms ease;
	}

	.btn-oauth:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.28);
	}

	.auth-footer {
		text-align: center;
		margin-top: var(--space-5);
		font-size: 13px;
		color: var(--mu);
	}

	.auth-footer a {
		color: var(--t);
		text-decoration: none;
	}

	.auth-footer a:hover {
		color: var(--t2);
	}
</style>
