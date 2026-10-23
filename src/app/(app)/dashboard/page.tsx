import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { label } from "@/lib/constants";
import { addDays, ageInYears, daysUntil, formatDate, formatMoney, relativeDue, startOfDayUTC } from "@/lib/format";
import { Badge, Empty, SectionHeader, Stat, statusTone } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const owned = { property: { ownerId: user.id } };
  const today = startOfDayUTC(new Date());
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));

  const [propertyCount, dueTasks, recentlyDone, expiringWarranties, openOrders, spend, agingCandidates] = await Promise.all([
    db.property.count({ where: { ownerId: user.id } }),
    db.maintenanceTask.findMany({
      where: { ...owned, active: true, nextDueDate: { lt: addDays(today, 31) } },
      orderBy: { nextDueDate: "asc" },
      include: { asset: { select: { name: true } }, property: { select: { id: true, name: true } } },
    }),
    db.workOrder.findMany({
      where: { ...owned, status: "completed", completedAt: { gte: addDays(today, -30) } },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: { asset: { select: { name: true } }, property: { select: { id: true, name: true } } },
    }),
    db.warranty.findMany({
      where: { asset: owned, endDate: { gte: today, lt: addDays(today, 91) } },
      orderBy: { endDate: "asc" },
      include: { asset: { select: { id: true, name: true, propertyId: true } } },
    }),
    db.workOrder.findMany({
      where: { ...owned, status: { in: ["open", "scheduled", "in_progress"] } },
      orderBy: { createdAt: "desc" },
      include: { property: { select: { id: true, name: true } } },
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

  if (propertyCount === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <h1 className="h1">Welcome, {user.name}</h1>
        <p className="text-muted">Start by adding your property. Then upload a receipt or warranty card and the assistant will build the asset record for you.</p>
        <Link href="/properties/new" className="btn">Add your first property</Link>
      </div>
    );
  }

  const overdue = dueTasks.filter((t) => daysUntil(t.nextDueDate) < 0);
  const upcoming = dueTasks.filter((t) => daysUntil(t.nextDueDate) >= 0);
  const aging = agingCandidates
    .map((a) => ({ ...a, left: a.expectedLifeYears! - (ageInYears(a.installDate ?? a.purchaseDate) ?? 0) }))
    .filter((a) => (a.installDate ?? a.purchaseDate) && a.left <= 1.5)
    .sort((a, b) => a.left - b.left);

  const taskList = (list: typeof dueTasks) => (
    <ul className="divide-y divide-border">
      {list.map((t) => (
        <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
          <Link href={`/properties/${t.property.id}/maintenance`} className="font-medium hover:underline">{t.title}</Link>
          <span className="text-xs text-muted">{[t.asset?.name, propertyCount > 1 ? t.property.name : null].filter(Boolean).join(" · ")}</span>
          <span className={`ml-auto text-xs ${daysUntil(t.nextDueDate) < 0 ? "text-danger" : "text-muted"}`}>{relativeDue(t.nextDueDate)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <h1 className="h1">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Overdue" value={overdue.length} hint="maintenance tasks" />
        <Stat label="Due in 30 days" value={upcoming.length} hint="maintenance tasks" />
        <Stat label="Warranties ending" value={expiringWarranties.length} hint="in the next 90 days" />
        <Stat label={`Upkeep spend ${today.getUTCFullYear()}`} value={formatMoney(spend._sum.amount ?? 0)} hint="services and repairs" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <SectionHeader title="Needs attention" />
          {overdue.length === 0 && openOrders.length === 0 ? (
            <Empty>Nothing overdue. Nice.</Empty>
          ) : (
            <>
              {overdue.length > 0 && taskList(overdue)}
              {openOrders.length > 0 && (
                <ul className="divide-y divide-border border-t border-border">
                  {openOrders.map((o) => (
                    <li key={o.id} className="flex items-baseline gap-3 py-2.5">
                      <Link href={`/properties/${o.property.id}/work-orders`} className="font-medium hover:underline">{o.title}</Link>
                      <span className="text-xs text-muted">Work order</span>
                      <span className="ml-auto"><Badge tone={statusTone(o.status)}>{label(o.status)}</Badge></span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="card">
          <SectionHeader title="Coming up (30 days)" />
          {upcoming.length === 0 ? <Empty>No maintenance due in the next month.</Empty> : taskList(upcoming)}
        </section>

        <section className="card">
          <SectionHeader title="Warranties ending soon" />
          {expiringWarranties.length === 0 ? (
            <Empty>No warranties end in the next 90 days.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {expiringWarranties.map((w) => (
                <li key={w.id} className="flex items-baseline gap-3 py-2.5">
                  <Link href={`/properties/${w.asset.propertyId}/assets/${w.asset.id}`} className="font-medium hover:underline">{w.asset.name}</Link>
                  <span className="text-xs text-muted">{w.provider}</span>
                  <span className="ml-auto text-xs text-warn">{formatDate(w.endDate)} · {daysUntil(w.endDate)} days</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <SectionHeader title="Recently completed" />
          {recentlyDone.length === 0 ? (
            <Empty>Completed services from the last 30 days show here.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {recentlyDone.map((o) => (
                <li key={o.id} className="flex items-baseline gap-3 py-2.5">
                  <span className="font-medium">{o.title}</span>
                  <span className="text-xs text-muted">{o.asset?.name}</span>
                  <span className="ml-auto text-xs text-muted">{formatDate(o.completedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {aging.length > 0 && (
          <section className="card lg:col-span-2">
            <SectionHeader title="Approaching replacement age" />
            <ul className="divide-y divide-border">
              {aging.map((a) => (
                <li key={a.id} className="flex items-baseline gap-3 py-2.5">
                  <Link href={`/properties/${a.propertyId}/assets/${a.id}`} className="font-medium hover:underline">{a.name}</Link>
                  <span className="ml-auto text-xs text-warn">
                    {a.left > 0 ? `~${a.left.toFixed(1)} years of expected life left` : "Past expected life"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
