import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { asLocale, asTheme, LOCALE_COOKIE, THEME_COOKIE } from "./config";
import { createTranslator } from "./translator";

/** The visitor's language from the cookie (English by default). */
export const getLocale = cache(async () => asLocale((await cookies()).get(LOCALE_COOKIE)?.value));

/** The visitor's colour theme from the cookie (light by default). */
export const getTheme = cache(async () => asTheme((await cookies()).get(THEME_COOKIE)?.value));

/** Translator for the current request. */
export const getT = cache(async () => createTranslator(await getLocale()));
