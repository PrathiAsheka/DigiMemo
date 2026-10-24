"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { changePassword, deleteAccount, updateProfile, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-ok">{state.ok}</p>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="card space-y-3">
      <h2 className="h2">{t("account.profile")}</h2>
      <div>
        <label className="field-label" htmlFor="name">{t("common.name")}</label>
        <input id="name" name="name" className="input" defaultValue={name} required maxLength={100} autoComplete="name" />
      </div>
      <div>
        <label className="field-label" htmlFor="email">{t("common.email")}</label>
        <input id="email" className="input bg-surface-2" value={email} readOnly aria-readonly="true" />
        <p className="mt-1 text-xs text-muted">{t("account.emailFixed")}</p>
      </div>
      <Status state={state} />
      <button className="btn" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await changePassword(prev, form);
    if (result?.ok) (document.getElementById("password-form") as HTMLFormElement | null)?.reset();
    return result;
  }, undefined);
  return (
    <form id="password-form" action={action} className="card space-y-3">
      <div>
        <h2 className="h2">{hasPassword ? t("account.changePassword") : t("account.setPasswordTitle")}</h2>
        {!hasPassword && <p className="text-xs text-muted">{t("account.googleOnlyHint")}</p>}
      </div>
      {hasPassword && (
        <div>
          <label className="field-label" htmlFor="current">{t("account.currentPassword")}</label>
          <input id="current" name="current" type="password" className="input" required autoComplete="current-password" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="next">{t("account.newPassword")}</label>
          <input id="next" name="next" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label className="field-label" htmlFor="confirm">{t("account.repeatPassword")}</label>
          <input id="confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" />
        </div>
      </div>
      <Status state={state} />
      <button className="btn" disabled={pending}>
        {pending ? t("common.saving") : hasPassword ? t("account.changePassword") : t("account.setPassword")}
      </button>
    </form>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, undefined);
  const [before, after] = t("account.typeToConfirm").split("{email}");
  return (
    <form action={action} className="card space-y-3 border-danger/40">
      <div>
        <h2 className="h2 text-danger">{t("account.deleteTitle")}</h2>
        <p className="text-sm text-muted">{t("account.deleteText")}</p>
      </div>
      <div>
        <label className="field-label" htmlFor="confirmEmail">
          {before}<span className="font-mono">{email}</span>{after}
        </label>
        <input id="confirmEmail" name="confirmEmail" className="input" autoComplete="off" required />
      </div>
      <Status state={state} />
      <button className="rounded-lg bg-danger px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" disabled={pending}>
        {pending ? t("account.deleting") : t("account.deleteButton")}
      </button>
    </form>
  );
}
