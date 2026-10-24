// Interface language and colour theme. Both are stored in cookies so the server can
// render the right language and theme on the first paint (no flash).

export const LOCALES = ["en", "si"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = "theme";

/** BCP 47 tags for dates and numbers. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", si: "si-LK" };

/** Shown in the language switcher, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", si: "සිංහල" };

export const asLocale = (v: string | null | undefined): Locale => (LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : DEFAULT_LOCALE;
export const asTheme = (v: string | null | undefined): Theme => (THEMES as readonly string[]).includes(v ?? "") ? (v as Theme) : DEFAULT_THEME;
