"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { str } from "@/lib/forms";
import { deleteSession } from "@/lib/session";
import { deleteStoredFile } from "@/lib/storage";

export type FormState = { ok?: string; error?: string } | undefined;

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(form, "name");
  if (!name || name.length > 100) return { error: "Enter a name (up to 100 characters)" };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (record.passwordHash && !(await bcrypt.compare(current, record.passwordHash))) {
    return { error: "Your current password is incorrect" };
  }
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  if (next !== confirm) return { error: "The new passwords don't match" };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: record.passwordHash ? "Password changed." : "Password set. You can now also sign in with email and password." };
}

/** Permanently deletes the account, its properties and every uploaded file. */
export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(form.get("confirmEmail") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Type your email address exactly to confirm" };
  }
  const docs = await db.document.findMany({ where: { property: { ownerId: user.id } }, select: { storageKey: true } });
  await db.user.delete({ where: { id: user.id } }); // cascades to properties, records, alerts
  await Promise.all(docs.map((d) => deleteStoredFile(d.storageKey)));
  await deleteSession();
  redirect("/");
}
