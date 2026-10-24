import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, ageInYears, daysUntil, startOfDayUTC } from "@/lib/format";
import { getProfile, profileForPropertyType } from "@/lib/profiles";
import { syncAlerts, unreadAlertCount } from "@/lib/alerts";
import { NotificationPrompt } from "@/components/alert-notifier";
import { Badge, Empty, SectionHeader } from "@/components/ui";
import { getT } from "@/i18n/server";

type Severity = "critical" | "soon";

type UrgentItem = {
  key: string;
  severity: Severity;
  kind: string;
  title: string;
  context: string;
  reason: string;
  href: string;
  action: string;
  sortDate: number;
};

export default async function DashboardPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const owned = { property: { ownerId: user.id } };
  const today = startOfDayUTC(new Date());
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));

  const profile = getProfile(user.useCase, t.locale);
  const [properties, dueTasks, recentlyDone, expiringWarranties, openOrders, flaggedAssets, spend, agingCandidates] =
    await Promise.all([
      db.property.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, type: true, _count: { select: { assets: true } } },
      }),
      db.maintenanceTask.findMany({
        where: { ...owned, active: true, nextDueDate: { lt: addDays(today, 31) } },
        orderBy: { nextDueDate: "asc" },
        include: { asset: { select: { name: true } }, property: { select: { id: true, name: true } } },
      }),
      db.workOrder.findMany({
        where: { ...owned, status: "completed", completedAt: { gte: addDays(today, -30) } },
        orderBy: { completedAt: "desc" },
        take: 6,
        include: { asset: { select: { name: true } } },
      }),
      db.warranty.findMany({
        where: { asset: owned, endDate: { gte: today, lt: addDays(today, 91) } },
        orderBy: { endDate: "asc" },
        include: { asset: { select: { id: true, name: true, propertyId: true, property: { select: { name: true } } } } },
      }),
      db.workOrder.findMany({
        where: { ...owned, status: { notIn: ["completed", "cancelled"] } },
        orderBy: { createdAt: "desc" },
        include: { asset: { select: { name: true } }, property: { select: { id: true, name: true } } },
      }),
      db.asset.findMany({
        where: { ...owned, status: { in: ["out_of_service", "needs_attention"] } },
        include: { property: { select: { name: true } } },
      }),
      db.costRecord.aggregate({
        where: { ...owned, date: { gte: yearStart }, category: { not: "purchase" } },
        _sum: { amount: true },
      }),
      db.asset.findMany({
        where: { ...owned, expectedLifeYears: { not: null }, status: { not: "retired" } },
        select: { id: true, name: true, propertyId: true, installDate: true, purchaseDate: true, expectedLifeYears: true },
      }),
    ]);

  const firstName = user.name.split(" ")[0];

  if (properties.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface text-center">
        <div className="space-y-4 p-8">
          <h1 className="h1">{t("dashboard.welcome", { name: firstName })}</h1>
          <p className="text-muted">{t("dashboard.startText", { noun: profile.noun })}</p>
          <Link href="/properties/new" className="btn">{t("dashboard.addYour", { noun: profile.noun })}</Link>
        </div>
      </div>
    );
  }

  const propertyCount = properties.length;
  const multi = propertyCount > 1;
  const assetTotal = properties.reduce((s, p) => s + p._count.assets, 0);
  const where = (property: string, asset?: string | null) => [asset, multi ? property : null].filter(Boolean).join(" · ");

  // ── Urgent: everything that needs action now or within a few days ─────────
  const urgent: UrgentItem[] = [];
  for (const task of dueTasks) {
    const days = daysUntil(task.nextDueDate);
    if (days > 3) continue;
    urgent.push({
      key: `task-${task.id}`,
      severity: days < 0 ? "critical" : "soon",
      kind: t("dashboard.kindMaintenance"),
      title: task.title,
      context: where(task.property.name, task.asset?.name),
      reason: t.due(task.nextDueDate),
      href: `/properties/${task.property.id}/maintenance`,
      action: t("dashboard.markDone"),
      sortDate: task.nextDueDate.getTime(),
    });
  }
  for (const o of openOrders) {
    if (o.priority !== "urgent" && o.priority !== "high") continue;
    urgent.push({
      key: `wo-${o.id}`,
      severity: o.priority === "urgent" ? "critical" : "soon",
      kind: t("dashboard.kindWorkOrder"),
      title: o.title,
      context: where(o.property.name, o.asset?.name),
      reason: t("dashboard.priorityReason", {
        priority: t.label(o.priority),
        status: o.providerId ? t.label(o.status) : t("dashboard.noOneAssigned"),
      }),
      href: `/properties/${o.property.id}/work-orders`,
      action: o.providerId ? t("dashboard.update") : t("dashboard.assign"),
      sortDate: o.createdAt.getTime(),
    });
  }
  for (const a of flaggedAssets) {
    urgent.push({
      key: `asset-${a.id}`,
      severity: a.status === "out_of_service" ? "critical" : "soon",
      kind: t("dashboard.kindAsset"),
      title: a.name,
      context: where(a.property.name),
      reason: t.label(a.status),
      href: `/properties/${a.propertyId}/assets/${a.id}`,
      action: t("common.view"),
      sortDate: a.updatedAt.getTime(),
    });
  }
  for (const w of expiringWarranties) {
    const days = daysUntil(w.endDate);
    if (days > 30) continue;
    urgent.push({
      key: `warranty-${w.id}`,
      severity: "soon",
      kind: t("dashboard.kindWarranty"),
      title: t("dashboard.warrantyTitle", { name: w.asset.name }),
      context: where(w.asset.property.name, w.provider),
      reason: t("dashboard.warrantyReason", { date: t.date(w.endDate), count: days }),
      href: `/properties/${w.asset.propertyId}/assets/${w.asset.id}`,
      action: t("common.view"),
      sortDate: w.endDate.getTime(),
    });
  }
  urgent.sort((a, b) => (a.severity === b.severity ? a.sortDate - b.sortDate : a.severity === "critical" ? -1 : 1));
  const critical = urgent.filter((u) => u.severity === "critical").length;

  const overdueCount = dueTasks.filter((task) => daysUntil(task.nextDueDate) < 0).length;
  const upcoming = dueTasks.filter((task) => daysUntil(task.nextDueDate) > 3);
  const aging = agingCandidates
    .map((a) => ({ ...a, left: a.expectedLifeYears! - (ageInYears(a.installDate ?? a.purchaseDate) ?? 0) }))
    .filter((a) => (a.installDate ?? a.purchaseDate) && a.left <= 1.5)
    .sort((a, b) => a.left - b.left);

  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? "time.goodMorning" : hour < 18 ? "time.goodAfternoon" : "time.goodEvening");
  await syncAlerts(user.id);
  const newAlerts = await unreadAlertCount(user.id);
  // Quick actions go straight to the property when there is only one.
  const base = multi ? null : `/properties/${properties[0].id}`;
  const sameKind = properties.every((p) => profileForPropertyType(p.type, profile).id === profile.id);

  return (
    <div className="space-y-6">
      <NotificationPrompt />

      {/* 1. Header: who, what, and the most common actions */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t.date(today)} · {profile.heroTagline}</p>
          <h1 className="h1 mt-1">{greeting}, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            {multi
              ? t("dashboard.propertyCount", { count: propertyCount, noun: sameKind ? profile.nounPlural : t("dashboard.properties") })
              : properties[0].name}{" "}
            · {t("dashboard.itemsTracked", { count: assetTotal })}
            {newAlerts > 0 && (
              <>
                {" · "}
                <Link href="/alerts?show=unread" className="font-medium text-accent hover:underline">
                  {t("dashboard.newAlerts", { count: newAlerts })}
                </Link>
              </>
            )}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label={t("dashboard.quickActions")}>
          <Link href={base ? `${base}/assets/new` : "/properties"} className="btn">+ {t("dashboard.addEquipment")}</Link>
          <Link href={base ? `${base}/documents` : "/properties"} className="btn-secondary">{t("dashboard.uploadDocument")}</Link>
          <Link href={base ? `${base}/work-orders` : "/properties"} className="btn-secondary">{t("dashboard.newWorkOrder")}</Link>
          <Link href="/alerts" className="btn-secondary">{t("dashboard.viewAlerts")}</Link>
        </nav>
      </header>

      {/* 2. At a glance: each number opens the list behind it */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatLink
          href={base ? `${base}/maintenance` : "/properties"}
          label={t("dashboard.statOverdue")}
          value={overdueCount}
          tone={overdueCount ? "danger" : "ok"}
          hint={overdueCount ? t("dashboard.statOverdueHint") : t("dashboard.statNoneOverdue")}
        />
        <StatLink
          href={base ? `${base}/work-orders` : "/properties"}
          label={t("dashboard.statOpenOrders")}
          value={openOrders.length}
          tone={openOrders.length ? "warn" : undefined}
          hint={t("dashboard.statOpenOrdersHint")}
        />
        <StatLink
          href="#warranties"
          label={t("dashboard.statWarranties")}
          value={expiringWarranties.length}
          tone={expiringWarranties.length ? "warn" : undefined}
          hint={t("dashboard.statWarrantiesHint")}
        />
        <StatLink
          href={base ? `${base}/costs` : "/properties"}
          label={t("dashboard.statSpend", { year: today.getUTCFullYear() })}
          value={t.money(spend._sum.amount ?? 0)}
          hint={t("dashboard.statSpendHint")}
        />
      </div>

      {/* 3. Act now (wide) beside what is next (narrow) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {urgent.length === 0 ? (
            <section className="flex h-full items-center gap-4 rounded-xl border border-ok/30 bg-ok-bg p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok text-accent-fg" aria-hidden="true">✓</span>
              <div>
                <h2 className="h2 text-ok">{t("dashboard.allClear")}</h2>
                <p className="text-sm text-muted">{t("dashboard.allClearText")}</p>
              </div>
            </section>
          ) : (
            <section
              className={`overflow-hidden rounded-xl border bg-surface ${critical ? "border-danger/40" : "border-warn/40"}`}
              aria-labelledby="urgent-heading"
            >
              <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${critical ? "bg-danger-bg" : "bg-warn-bg"}`}>
                <h2 id="urgent-heading" className={`h2 ${critical ? "text-danger" : "text-warn"}`}>
                  {t("dashboard.needsAttention", { count: urgent.length })}
                </h2>
                <span className="text-xs text-muted">
                  {critical > 0 && t("dashboard.urgentCount", { count: critical })}
                  {critical > 0 && urgent.length > critical && " · "}
                  {urgent.length > critical && t("dashboard.soonCount", { count: urgent.length - critical })}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {urgent.map((u) => (
                  <li key={u.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${u.severity === "critical" ? "bg-danger" : "bg-warn"}`}
                      aria-label={u.severity === "critical" ? t("dashboard.urgent") : t("dashboard.dueSoon")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{u.title}</span>
                        {u.context && <span className="text-xs text-muted">{u.context}</span>}
                      </div>
                      <div className={`text-sm ${u.severity === "critical" ? "text-danger" : "text-warn"}`}>
                        <span className="text-muted">{u.kind} · </span>
                        {u.reason}
                      </div>
                    </div>
                    <Link href={u.href} className="btn-secondary py-1.5">{u.action}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="card">
          <SectionHeader title={t("dashboard.comingUp")}>
            {base && <Link href={`${base}/maintenance`} className="btn-link text-xs">{t("dashboard.allTasks")}</Link>}
          </SectionHeader>
          {upcoming.length === 0 ? (
            <Empty>{t("dashboard.nothingElse")}</Empty>
          ) : (
            <ol className="space-y-3">
              {upcoming.slice(0, 6).map((task) => (
                <li key={task.id} className="flex gap-3">
                  <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-surface-2 py-1 text-center leading-tight">
                    <span className="text-[10px] font-medium uppercase text-muted">{t.month(task.nextDueDate)}</span>
                    <span className="text-base font-semibold">{task.nextDueDate.getUTCDate()}</span>
                  </span>
                  <div className="min-w-0">
                    <Link href={`/properties/${task.property.id}/maintenance`} className="block truncate text-sm font-medium hover:underline">
                      {task.title}
                    </Link>
                    <span className="block truncate text-xs text-muted">{where(task.property.name, task.asset?.name) || t("common.wholeProperty")}</span>
                  </div>
                </li>
              ))}
              {upcoming.length > 6 && <li className="text-xs text-muted">{t("dashboard.more", { count: upcoming.length - 6 })}</li>}
            </ol>
          )}
        </section>
      </div>

      {/* 4. Keep track: work in progress, cover ending, recent history */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card">
          <SectionHeader title={t("dashboard.openOrders")} />
          {openOrders.length === 0 ? (
            <Empty>{t("dashboard.noOpenOrders")}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {openOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
                  <Link href={`/properties/${o.property.id}/work-orders`} className="text-sm font-medium hover:underline">{o.title}</Link>
                  <span className="ml-auto"><Badge>{t.label(o.status)}</Badge></span>
                  <span className="w-full text-xs text-muted">{where(o.property.name, o.asset?.name)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card scroll-mt-6" id="warranties">
          <SectionHeader title={t("dashboard.warrantiesEnding")} />
          {expiringWarranties.length === 0 ? (
            <Empty>{t("dashboard.noWarranties")}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {expiringWarranties.map((w) => (
                <li key={w.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                  <Link href={`/properties/${w.asset.propertyId}/assets/${w.asset.id}`} className="text-sm font-medium hover:underline">
                    {w.asset.name}
                  </Link>
                  <span className="ml-auto text-xs text-warn">{t("time.days", { count: daysUntil(w.endDate) })}</span>
                  <span className="w-full text-xs text-muted">{[w.provider, t.date(w.endDate)].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <SectionHeader title={t("dashboard.recentlyCompleted")} />
          {recentlyDone.length === 0 ? (
            <Empty>{t("dashboard.noRecent")}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {recentlyDone.map((o) => (
                <li key={o.id} className="flex flex-wrap items-baseline gap-x-2 py-2.5">
                  <span className="text-ok" aria-hidden="true">✓</span>
                  <span className="text-sm font-medium">{o.title}</span>
                  <span className="ml-auto text-xs text-muted">{t.date(o.completedAt)}</span>
                  {o.asset && <span className="w-full pl-5 text-xs text-muted">{o.asset.name}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 5. Plan ahead */}
      {aging.length > 0 && (
        <section className="card">
          <SectionHeader title={t("dashboard.replacementAge")} />
          <p className="-mt-1 mb-3 text-xs text-muted">{t("dashboard.replacementHint")}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aging.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3">
                <Link href={`/properties/${a.propertyId}/assets/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                <div className="mt-0.5 text-xs text-warn">
                  {a.left > 0 ? t("dashboard.lifeLeft", { years: a.left.toFixed(1) }) : t("dashboard.pastLife")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A summary number that links to the list behind it. */
function StatLink({
  href,
  label: text,
  value,
  hint,
  tone,
}: {
  href: string;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "danger" | "warn" | "ok";
}) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-accent hover:shadow-md"
    >
      <div className="truncate text-xs font-medium text-muted">{text}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 hidden truncate text-xs text-muted md:block">{hint}</div>}
    </Link>
  );
}
