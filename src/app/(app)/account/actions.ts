"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { str } from "@/lib/forms";
import { deleteSession } from "@/lib/session";
import { deleteStoredFile } from "@/lib/storage";
import { getT } from "@/i18n/server";

export type FormState = { ok?: string; error?: string } | undefined;

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const name = str(form, "name");
  if (!name || name.length > 100) return { error: t("account.errName") };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: t("common.saved") };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (record.passwordHash && !(await bcrypt.compare(current, record.passwordHash))) {
    return { error: t("account.errCurrent") };
  }
  if (next.length < 8) return { error: t("account.errShort") };
  if (next !== confirm) return { error: t("account.errMatch") };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: record.passwordHash ? t("account.passwordChanged") : t("account.passwordSet") };
}

/** Permanently deletes the account, its properties and every uploaded file. */
export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  if (String(form.get("confirmEmail") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: t("account.errConfirm") };
  }
  const docs = await db.document.findMany({ where: { property: { ownerId: user.id } }, select: { storageKey: true } });
  await db.user.delete({ where: { id: user.id } }); // cascades to properties, records, alerts
  await Promise.all(docs.map((d) => deleteStoredFile(d.storageKey)));
  await deleteSession();
  redirect("/");
}
