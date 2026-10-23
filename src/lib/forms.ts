// Small helpers for reading FormData in server actions.

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

export function oneOf<T extends readonly string[]>(form: FormData, key: string, allowed: T, fallback: T[number]): T[number] {
  const v = str(form, key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}
