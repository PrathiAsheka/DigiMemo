const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatMoney(amount: number | null | undefined, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function daysUntil(d: Date, now = new Date()) {
  return Math.ceil((startOfDayUTC(d).getTime() - startOfDayUTC(now).getTime()) / DAY_MS);
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * DAY_MS);
}

export function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function relativeDue(d: Date) {
  const days = daysUntil(d);
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  return `due in ${days} day${days === 1 ? "" : "s"}`;
}

export function ageInYears(from: Date | null | undefined, now = new Date()) {
  if (!from) return null;
  return (now.getTime() - from.getTime()) / (365.25 * DAY_MS);
}
