"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { getLocale, getT } from "@/i18n/server";
import { asLocale, LOCALE_COOKIE } from "@/i18n/config";

export type AuthState = { error?: string } | undefined;

/** Use the account's saved language on this device too. */
async function rememberLocale(locale: string) {
  (await cookies()).set(LOCALE_COOKIE, asLocale(locale), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const t = await getT();
  const schema = z.object({
    name: z.string().trim().min(1, t("auth.errName")).max(100),
    email: z.email(t("auth.errEmail")).transform((e) => e.toLowerCase()),
    password: z.string().min(8, t("auth.errPassword")).max(200),
  });
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: t("auth.errExists") };
  }
  const user = await db.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), locale: await getLocale() },
  });
  await createSession(user.id);
  redirect("/welcome");
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const t = await getT();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.passwordHash) {
    return { error: t("auth.errGoogleOnly") };
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash!))) {
    return { error: t("auth.errWrong") };
  }
  await createSession(user.id);
  await rememberLocale(user.locale);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
