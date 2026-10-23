"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "./actions";

const GOOGLE_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up on this server yet. Use email and password for now.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_unverified: "That Google account's email isn't verified, so it can't be linked to an existing account.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AuthForm({ mode, error }: { mode: "login" | "signup"; error?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : signup,
    undefined,
  );
  const googleError = error ? GOOGLE_ERRORS[error] : undefined;

  return (
    <div className="card w-full max-w-sm space-y-5">
      <div>
        <h1 className="h1">{mode === "login" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "login" ? "Welcome back. Sign in to see what needs attention." : "Set up your home, apartment or business in a few minutes."}
        </p>
      </div>

      {/* Plain link: the route redirects to Google, so no client JS is needed */}
      <a
        href="/api/auth/google"
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium shadow-sm transition hover:border-accent hover:bg-surface-2"
      >
        <GoogleIcon />
        {mode === "login" ? "Continue with Google" : "Sign up with Google"}
      </a>
      {googleError && <p className="text-sm text-danger">{googleError}</p>}

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={action} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="field-label" htmlFor="name">Name</label>
            <input className="input" id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>No account? <Link className="btn-link" href="/signup">Create one</Link></>
        ) : (
          <>Already registered? <Link className="btn-link" href="/login">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
