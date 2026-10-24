// A small, dependency-free translator. `t("dashboard.title", { name })` looks a key up in
// the active language (falling back to English), fills {placeholders}, and picks
// "<key>_one" / "<key>_other" when a `count` is given. Works on server and client.

import { INTL_LOCALE, type Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { si } from "./messages/si";

const DICTIONARIES: Record<Locale, Messages> = { en, si };

// "a.b.c" paths into the dictionary, plus plural bases ("x" for "x_one"/"x_other").
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
type AllKeys = Leaves<Messages>;
type PluralBase<K> = K extends `${infer B}_one` ? B : never;
export type MessageKey = AllKeys | PluralBase<AllKeys>;

type Vars = Record<string, string | number>;

function lookup(dict: unknown, path: string): string | undefined {
  let node = dict;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

const humanize = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export type Translator = ((key: MessageKey, vars?: Vars) => string) & {
  locale: Locale;
  /** Translated name for a stored value (category, status, kind…); custom values pass through. */
  label: (value: string) => string;
  /** "Oct 23, 2026" / "2026 ඔක් 23". */
  date: (d: Date | null | undefined) => string;
  /** Month abbreviation for calendar chips. */
  month: (d: Date) => string;
  money: (amount: number | null | undefined, currency?: string) => string;
  /** "3 days overdue", "due today", "due in 5 days". */
  due: (d: Date) => string;
};

export function createTranslator(locale: Locale): Translator {
  const dict = DICTIONARIES[locale];
  const tag = INTL_LOCALE[locale];

  const t = ((key: string, vars?: Vars) => {
    if (vars && typeof vars.count === "number") {
      const pluralKey = `${key}_${vars.count === 1 ? "one" : "other"}`;
      const p = lookup(dict, pluralKey) ?? lookup(en, pluralKey);
      if (p) return fill(p, vars);
    }
    return fill(lookup(dict, key) ?? lookup(en, key) ?? key, vars);
  }) as Translator;

  t.locale = locale;
  t.label = (value) => lookup(dict, `enum.${value}`) ?? lookup(en, `enum.${value}`) ?? humanize(value);
  t.date = (d) => (d ? d.toLocaleDateString(tag, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "—");
  t.month = (d) => d.toLocaleDateString(tag, { month: "short", timeZone: "UTC" });
  t.money = (amount, currency = "USD") =>
    amount == null ? "—" : new Intl.NumberFormat(tag, { style: "currency", currency }).format(amount);
  t.due = (d) => {
    const today = new Date();
    const start = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
    const days = Math.round((start(d) - start(today)) / 86_400_000);
    if (days < 0) return t("time.overdueBy", { count: -days });
    if (days === 0) return t("time.dueToday");
    return t("time.dueIn", { count: days });
  };
  return t;
}
