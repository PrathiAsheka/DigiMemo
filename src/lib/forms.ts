// Small helpers for reading FormData in server actions.

import { OTHER } from "./other";

export function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function required(form: FormData, key: string): string {
  const v = str(form, key);
  if (!v) throw new Error(`${key} is required`);
  return v;
}

export function int(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v == null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function float(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v == null) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Parses yyyy-mm-dd as a UTC date. */
export function date(form: FormData, key: string): Date | null {
  const v = str(form, key);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return new Date(`${v}T00:00:00.000Z`);
}

/** Text typed next to a dropdown's "Other…" choice, if that choice was picked. */
export function otherText(form: FormData, key: string): string | null {
  if (str(form, key) !== OTHER) return null;
  return str(form, `${key}__other`)?.replace(/\s+/g, " ").slice(0, 60) ?? null;
}

/**
 * A dropdown value from a known list, or the user's own text when they picked "Other…"
 * (stored as typed; "other" if they left the box empty). Unknown values fall back.
 */
export function oneOf<T extends readonly string[]>(form: FormData, key: string, allowed: T, fallback: T[number]): string {
  const v = str(form, key);
  if (v === OTHER) return otherText(form, key) ?? "other";
  return v && (allowed as readonly string[]).includes(v) ? v : fallback;
}

/** A "repeat every N days" dropdown, where "Other…" means a typed number of days. */
export function intervalDays(form: FormData, key: string): number | null {
  const raw = str(form, key) === OTHER ? str(form, `${key}__other`) : str(form, key);
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 3650) : null;
}
