import "server-only";
import { db } from "./db";
import { addDays, ageInYears, daysUntil, startOfDayUTC } from "./format";
import { asLocale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translator";

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

/** Builds the alerts that should exist now, written in the user's language. */
async function desiredAlerts(userId: string): Promise<Desired[]> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { remindTaskDays: true, remindWarrantyDays: true, remindLifeMonths: true, locale: true },
  });
  const t = createTranslator(asLocale(user.locale));
  const days = (count: number) => t("time.days", { count });
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

  for (const task of tasks) {
    const d = daysUntil(task.nextDueDate);
    const where = at(task.property.name, task.asset?.name) || t("common.wholeProperty");
    const date = t.date(task.nextDueDate);
    out.push({
      key: `task:${task.id}:${iso(task.nextDueDate)}`,
      kind: "maintenance",
      severity: d < 0 ? "critical" : d <= 2 ? "warning" : "info",
      title:
        d < 0
          ? t("alertText.taskOverdue", { title: task.title })
          : d === 0
            ? t("alertText.taskToday", { title: task.title })
            : t("alertText.taskSoon", { title: task.title, days: days(d) }),
      message: d < 0 ? t("alertText.taskLateMessage", { where, date, days: days(-d) }) : t("alertText.taskMessage", { where, date }),
      href: `/properties/${task.property.id}/maintenance`,
      propertyId: task.property.id,
      dueAt: task.nextDueDate,
    });
  }

  for (const w of warranties) {
    const d = daysUntil(w.endDate);
    const what = /contract/i.test(`${w.provider ?? ""} ${w.terms ?? ""}`) ? "contract" : "warranty";
    const name = w.asset.name;
    const date = t.date(w.endDate);
    out.push({
      key: `warranty:${w.id}:${iso(w.endDate)}`,
      kind: what,
      severity: d < 0 ? "info" : d <= 7 ? "warning" : "info",
      title:
        d < 0
          ? t(`alertText.${what}Ended`, { name })
          : d === 0
            ? t(`alertText.${what}EndsToday`, { name })
            : t(`alertText.${what}EndsIn`, { name, days: days(d) }),
      message:
        d < 0
          ? t("alertText.coverEndedMessage", { date })
          : t("alertText.coverMessage", { cover: [w.provider, w.terms].filter(Boolean).join(": ") || t("alertText.coverage"), date }),
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
        title: t("alertText.assetStatus", { name: a.name, status: t.label(a.status) }),
        message: t("alertText.assetStatusMessage", { where: at(a.property.name) || a.property.name }),
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
          title: yearsLeft <= 0 ? t("alertText.pastLife", { name: a.name }) : t("alertText.nearLife", { name: a.name }),
          message:
            yearsLeft <= 0
              ? t("alertText.pastLifeMessage", { years: a.expectedLifeYears })
              : t("alertText.nearLifeMessage", { count: Math.max(1, Math.round(yearsLeft * 12)) }),
          href,
          propertyId: a.property.id,
          dueAt: null,
        });
      }
    }
  }

  for (const o of orders) {
    const where = at(o.property.name, o.asset?.name) || o.property.name;
    if (o.priority === "urgent" || o.priority === "high") {
      out.push({
        key: `wo:${o.id}:${o.priority}`,
        kind: "work_order",
        severity: o.priority === "urgent" ? "critical" : "warning",
        title: t("alertText.priorityOrder", { priority: t.label(o.priority), title: o.title }),
        message: `${where} · ${o.providerId ? t.label(o.status) : t("alertText.noOneAssigned")}`,
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
          title:
            d === 0
              ? t("alertText.visitToday", { title: o.title })
              : d === 1
                ? t("alertText.visitTomorrow", { title: o.title })
                : t("alertText.visitIn", { title: o.title, days: days(d) }),
          message: t("alertText.visitMessage", { where }),
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
      title: t("alertText.reviewDoc", { name: doc.filename }),
      message: t("alertText.reviewDocMessage", { where: doc.property.name }),
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
