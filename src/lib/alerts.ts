import "server-only";
import { db } from "./db";
import { addDays, ageInYears, daysUntil, formatDate, startOfDayUTC } from "./format";
import { label } from "./constants";

// Alerts are derived from the property record. Each condition has a stable `key`, so an
// alert is raised once (keeping its read/snoozed/dismissed state), updated while the
// condition holds, and marked resolved when it clears (task done, warranty renewed…).
// A new due date makes a new key, so a recurring task alerts again next cycle.

export type Severity = "critical" | "warning" | "info";

type Desired = {
  key: string;
  kind: string;
  severity: Severity;
  title: string;
  message: string;
  href: string;
  propertyId: string;
  dueAt: Date | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

async function desiredAlerts(userId: string): Promise<Desired[]> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { remindTaskDays: true, remindWarrantyDays: true, remindLifeMonths: true },
  });
  const today = startOfDayUTC(new Date());
  const owned = { property: { ownerId: userId } };
  const multi = (await db.property.count({ where: { ownerId: userId } })) > 1;
  const at = (propertyName: string, assetName?: string | null) =>
    [assetName, multi ? propertyName : null].filter(Boolean).join(" · ");

  const [tasks, warranties, assets, orders, docs] = await Promise.all([
    db.maintenanceTask.findMany({
      where: { ...owned, active: true, nextDueDate: { lte: addDays(today, user.remindTaskDays) } },
      include: { asset: { select: { name: true } }, property: { select: { id: true, name: true } } },
    }),
    db.warranty.findMany({
      where: { asset: owned, endDate: { gte: addDays(today, -7), lte: addDays(today, user.remindWarrantyDays) } },
      include: { asset: { select: { id: true, name: true, property: { select: { id: true, name: true } } } } },
    }),
    db.asset.findMany({
      where: { ...owned, status: { not: "retired" } },
      select: {
        id: true, name: true, status: true, expectedLifeYears: true, installDate: true, purchaseDate: true,
        property: { select: { id: true, name: true } },
      },
    }),
    db.workOrder.findMany({
      where: { ...owned, status: { notIn: ["completed", "cancelled"] } },
      include: { asset: { select: { name: true } }, property: { select: { id: true, name: true } } },
    }),
    db.document.findMany({
      where: { ...owned, extractionStatus: "ready" },
      select: { id: true, filename: true, property: { select: { id: true, name: true } } },
    }),
  ]);

  const out: Desired[] = [];

  for (const t of tasks) {
    const d = daysUntil(t.nextDueDate);
    out.push({
      key: `task:${t.id}:${iso(t.nextDueDate)}`,
      kind: "maintenance",
      severity: d < 0 ? "critical" : d <= 2 ? "warning" : "info",
      title: d < 0 ? `${t.title} is overdue` : d === 0 ? `${t.title} is due today` : `${t.title} is due in ${days(d)}`,
      message: `${at(t.property.name, t.asset?.name) || "Whole property"} · due ${formatDate(t.nextDueDate)}${d < 0 ? ` (${days(-d)} late)` : ""}`,
      href: `/properties/${t.property.id}/maintenance`,
      propertyId: t.property.id,
      dueAt: t.nextDueDate,
    });
  }

  for (const w of warranties) {
    const d = daysUntil(w.endDate);
    const what = /contract/i.test(`${w.provider ?? ""} ${w.terms ?? ""}`) ? "contract" : "warranty";
    out.push({
      key: `warranty:${w.id}:${iso(w.endDate)}`,
      kind: what,
      severity: d < 0 ? "info" : d <= 7 ? "warning" : "info",
      title:
        d < 0
          ? `${w.asset.name} ${what} has ended`
          : `${w.asset.name} ${what} ends ${d === 0 ? "today" : `in ${days(d)}`}`,
      message:
        d < 0
          ? `Ended ${formatDate(w.endDate)}. Renew it or note that it's out of cover.`
          : `${[w.provider, w.terms].filter(Boolean).join(": ") || "Coverage"}. Ends ${formatDate(w.endDate)}; report any faults or renew before then.`,
      href: `/properties/${w.asset.property.id}/assets/${w.asset.id}`,
      propertyId: w.asset.property.id,
      dueAt: w.endDate,
    });
  }

  for (const a of assets) {
    const href = `/properties/${a.property.id}/assets/${a.id}`;
    if (a.status === "out_of_service" || a.status === "needs_attention") {
      out.push({
        key: `asset:${a.id}:${a.status}`,
        kind: "asset",
        severity: a.status === "out_of_service" ? "critical" : "warning",
        title: `${a.name}: ${label(a.status).toLowerCase()}`,
        message: `${at(a.property.name) || a.property.name} · create a work order or update its status once fixed.`,
        href,
        propertyId: a.property.id,
        dueAt: null,
      });
    }
    const start = a.installDate ?? a.purchaseDate;
    if (a.expectedLifeYears && start) {
      const yearsLeft = a.expectedLifeYears - (ageInYears(start) ?? 0);
      if (yearsLeft * 12 <= user.remindLifeMonths) {
        out.push({
          key: `life:${a.id}:${a.expectedLifeYears}`,
          kind: "lifecycle",
          severity: yearsLeft <= 0 ? "warning" : "info",
          title: yearsLeft <= 0 ? `${a.name} is past its expected life` : `${a.name} is nearing replacement age`,
          message:
            yearsLeft <= 0
              ? `Expected life was ${a.expectedLifeYears} years. Start getting quotes before it fails.`
              : `About ${Math.max(1, Math.round(yearsLeft * 12))} months of expected life left. Budget for a replacement.`,
          href,
          propertyId: a.property.id,
          dueAt: null,
        });
      }
    }
  }

  for (const o of orders) {
    const where = at(o.property.name, o.asset?.name);
    if (o.priority === "urgent" || o.priority === "high") {
      out.push({
        key: `wo:${o.id}:${o.priority}`,
        kind: "work_order",
        severity: o.priority === "urgent" ? "critical" : "warning",
        title: `${label(o.priority)} priority: ${o.title}`,
        message: `${where || o.property.name} · ${o.providerId ? label(o.status) : "no one assigned yet"}`,
        href: `/properties/${o.property.id}/work-orders`,
        propertyId: o.property.id,
        dueAt: null,
      });
    }
    if (o.scheduledFor) {
      const d = daysUntil(o.scheduledFor);
      if (d >= 0 && d <= 2) {
        out.push({
          key: `visit:${o.id}:${iso(o.scheduledFor)}`,
          kind: "work_order",
          severity: "info",
          title: `${o.title} is scheduled ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${days(d)}`}`,
          message: `${where || o.property.name} · make sure someone can let them in.`,
          href: `/properties/${o.property.id}/work-orders`,
          propertyId: o.property.id,
          dueAt: o.scheduledFor,
        });
      }
    }
  }

  for (const doc of docs) {
    out.push({
      key: `doc:${doc.id}`,
      kind: "document",
      severity: "info",
      title: `Check what AI read from ${doc.filename}`,
      message: `${doc.property.name} · nothing is saved until you confirm.`,
      href: `/properties/${doc.property.id}/documents/${doc.id}`,
      propertyId: doc.property.id,
      dueAt: null,
    });
  }

  return out;
}

// Layout and page render in parallel, so concurrent callers share one in-flight sync.
const recent = new Map<string, { at: number; run: Promise<void> }>();

/** Brings stored alerts in line with the record. Cheap enough per page; reused for 20s. */
export function syncAlerts(userId: string, { force = false } = {}) {
  const prev = recent.get(userId);
  if (!force && prev && Date.now() - prev.at < 20_000) return prev.run;
  const run = doSync(userId).catch((error) => {
    recent.delete(userId);
    throw error;
  });
  recent.set(userId, { at: Date.now(), run });
  return run;
}

async function doSync(userId: string) {
  const desired = await desiredAlerts(userId);
  const existing = await db.alert.findMany({ where: { userId }, select: { id: true, key: true, resolvedAt: true } });
  const byKey = new Map(existing.map((a) => [a.key, a]));
  const want = new Set(desired.map((d) => d.key));

  const toCreate = desired.filter((d) => !byKey.has(d.key));
  if (toCreate.length) await db.alert.createMany({ data: toCreate.map((d) => ({ ...d, userId })) });

  for (const d of desired) {
    const e = byKey.get(d.key);
    if (e) {
      await db.alert.update({
        where: { id: e.id },
        data: { title: d.title, message: d.message, severity: d.severity, href: d.href, resolvedAt: null },
      });
    }
  }

  const gone = existing.filter((e) => !e.resolvedAt && !want.has(e.key)).map((e) => e.id);
  if (gone.length) await db.alert.updateMany({ where: { id: { in: gone } }, data: { resolvedAt: new Date() } });
}

/** Alerts the user should currently see (not resolved, dismissed or snoozed). */
export function activeAlertsWhere(userId: string) {
  return {
    userId,
    resolvedAt: null,
    dismissedAt: null,
    OR: [{ snoozedTill: null }, { snoozedTill: { lt: new Date() } }],
  };
}

export async function unreadAlertCount(userId: string) {
  return db.alert.count({ where: { ...activeAlertsWhere(userId), readAt: null } });
}
