"use client";

import { useActionState } from "react";
import { changePassword, deleteAccount, updateProfile, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-ok">{state.ok}</p>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="card space-y-3">
      <h2 className="h2">Profile</h2>
      <div>
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" name="name" className="input" defaultValue={name} required maxLength={100} autoComplete="name" />
      </div>
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" className="input bg-surface-2" value={email} readOnly aria-readonly="true" />
        <p className="mt-1 text-xs text-muted">Your email is your sign-in name and can&apos;t be changed here.</p>
      </div>
      <Status state={state} />
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await changePassword(prev, form);
    if (result?.ok) (document.getElementById("password-form") as HTMLFormElement | null)?.reset();
    return result;
  }, undefined);
  return (
    <form id="password-form" action={action} className="card space-y-3">
      <div>
        <h2 className="h2">{hasPassword ? "Change password" : "Set a password"}</h2>
        {!hasPassword && <p className="text-xs text-muted">You sign in with Google. Set a password to also sign in with email.</p>}
      </div>
      {hasPassword && (
        <div>
          <label className="field-label" htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" className="input" required autoComplete="current-password" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="next">New password</label>
          <input id="next" name="next" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label className="field-label" htmlFor="confirm">Repeat new password</label>
          <input id="confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      <Status state={state} />
      <button className="btn" disabled={pending}>{pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}</button>
    </form>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, undefined);
  return (
    <form action={action} className="card space-y-3 border-danger/40">
      <div>
        <h2 className="h2 text-danger">Delete account</h2>
        <p className="text-sm text-muted">
          Permanently deletes your account, every property, all equipment, maintenance and cost history, and every uploaded document and photo. This can&apos;t be undone.
        </p>
      </div>
      <div>
        <label className="field-label" htmlFor="confirmEmail">Type <span className="font-mono">{email}</span> to confirm</label>
        <input id="confirmEmail" name="confirmEmail" className="input" autoComplete="off" required />
      </div>
      <Status state={state} />
      <button className="rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" disabled={pending}>
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
