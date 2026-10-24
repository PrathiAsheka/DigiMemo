"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { syncAlerts } from "@/lib/alerts";
import { asLocale, asTheme, LOCALE_COOKIE, THEME_COOKIE } from "@/i18n/config";

const YEAR = 60 * 60 * 24 * 365;

export async function setLanguage(value: string) {
  const locale = asLocale(value);
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const userId = await getSessionUserId();
  if (userId) {
    await db.user.update({ where: { id: userId }, data: { locale } });
    await syncAlerts(userId, { force: true }); // rewrite alert text in the new language
  }
  revalidatePath("/", "layout");
}

export async function setTheme(value: string) {
  (await cookies()).set(THEME_COOKIE, asTheme(value), { path: "/", maxAge: YEAR, sameSite: "lax" });
}
