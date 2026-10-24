import Link from "next/link";
import type { Alert } from "@prisma/client";
import { activeAlertsWhere, syncAlerts } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Field, Hidden, PageHeader, Select } from "@/components/ui";
import { NotificationSettings } from "@/components/alert-notifier";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import {
  dismissAlert,
  markAlertRead,
  markAllAlertsRead,
  restoreAlert,
  snoozeAlert,
  updateReminderSettings,
} from "./actions";

const KIND_ICON: Record<string, string> = {
  maintenance: "🛠",
  warranty: "🛡",
  contract: "📄",
  lifecycle: "⏳",
  work_order: "📋",
  asset: "⚠",
  document: "📎",
};

const KINDS = ["maintenance", "warranty", "contract", "lifecycle", "work_order", "asset", "document"] as const;
type Kind = (typeof KINDS)[number];
const isKind = (k: string): k is Kind => (KINDS as readonly string[]).includes(k);
const kindLabel = (t: Translator, k: string) => (isKind(k) ? t(`alerts.kind_${k}`) : k);

const GROUPS = [
  { severity: "critical", title: "alerts.actNow", tone: "border-danger/40", head: "bg-danger-bg text-danger", dot: "bg-danger" },
  { severity: "warning", title: "alerts.comingUp", tone: "border-warn/40", head: "bg-warn-bg text-warn", dot: "bg-warn" },
  { severity: "info", title: "alerts.fyi", tone: "border-border", head: "bg-surface-2 text-foreground", dot: "bg-accent" },
] as const;

const choices = (values: number[], label: (v: number) => string) => values.map((v) => ({ value: String(v), label: label(v) }));

export default async function AlertsPage({ searchParams }: PageProps<"/alerts">) {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  await syncAlerts(user.id, { force: true });
  const { show, kind } = await searchParams;
  const unreadOnly = show === "unread";
  const kindFilter = typeof kind === "string" && isKind(kind) ? kind : null;

  const [alerts, hidden, settings, kinds] = await Promise.all([
    db.alert.findMany({
      where: { ...activeAlertsWhere(user.id), ...(unreadOnly ? { readAt: null } : {}), ...(kindFilter ? { kind: kindFilter } : {}) },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    }),
    db.alert.findMany({
      where: { userId: user.id, resolvedAt: null, OR: [{ dismissedAt: { not: null } }, { snoozedTill: { gte: new Date() } }] },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { remindTaskDays: true, remindWarrantyDays: true, remindLifeMonths: true },
    }),
    db.alert.groupBy({ by: ["kind"], where: activeAlertsWhere(user.id), _count: true }),
  ]);
  const unreadCount = alerts.filter((a) => !a.readAt).length;

  const filterHref = (next: { show?: string | null; kind?: string | null }) => {
    const p = new URLSearchParams();
    const s = next.show === undefined ? show : next.show;
    const k = next.kind === undefined ? kindFilter : next.kind;
    if (typeof s === "string" && s) p.set("show", s);
    if (k) p.set("kind", k);
    const q = p.toString();
    return q ? `/alerts?${q}` : "/alerts";
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface hover:border-accent"}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.alerts")}
        description={t("alerts.description")}
      >
        {unreadCount > 0 && (
          <form action={markAllAlertsRead}>
            <button className="btn-secondary">{t("alerts.markAllRead")}</button>
          </form>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link href={filterHref({ show: null })} className={chip(!unreadOnly)}>{t("alerts.all")}</Link>
            <Link href={filterHref({ show: "unread" })} className={chip(unreadOnly)}>{t("alerts.unread")}</Link>
            <span className="mx-1 w-px bg-border" />
            <Link href={filterHref({ kind: null })} className={chip(!kindFilter)}>{t("alerts.everyType")}</Link>
            {kinds.map((k) => (
              <Link key={k.kind} href={filterHref({ kind: k.kind })} className={chip(kindFilter === k.kind)}>
                {kindLabel(t, k.kind)} ({k._count})
              </Link>
            ))}
          </div>

          {alerts.length === 0 ? (
            <section className="flex items-center gap-4 rounded-xl border border-ok/30 bg-ok-bg p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok text-accent-fg" aria-hidden="true">✓</span>
              <div>
                <h2 className="h2 text-ok">{unreadOnly || kindFilter ? t("alerts.nothingHere") : t("alerts.none")}</h2>
                <p className="text-sm text-muted">{t("alerts.upToDate")}</p>
              </div>
            </section>
          ) : (
            GROUPS.map((g) => {
              const list = alerts.filter((a) => a.severity === g.severity);
              if (!list.length) return null;
              return (
                <section key={g.severity} className={`overflow-hidden rounded-xl border bg-surface ${g.tone}`}>
                  <h2 className={`px-5 py-2.5 text-sm font-semibold ${g.head}`}>
                    {t(g.title)} ({list.length})
                  </h2>
                  <ul className="divide-y divide-border">
                    {list.map((a) => <AlertRow key={a.id} t={t} alert={a} dot={g.dot} />)}
                  </ul>
                </section>
              );
            })
          )}

          {hidden.length > 0 && (
            <details className="card">
              <summary className="cursor-pointer text-sm font-medium">{t("alerts.hidden", { count: hidden.length })}</summary>
              <ul className="mt-3 divide-y divide-border">
                {hidden.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="text-muted">{a.title}</span>
                    <span className="text-xs text-muted">
                      {a.dismissedAt ? t("alerts.dismissed") : t("alerts.snoozedUntil", { date: t.date(a.snoozedTill) })}
                    </span>
                    <form action={restoreAlert} className="ml-auto">
                      <Hidden name="alertId" value={a.id} />
                      <button className="btn-link">{t("alerts.restore")}</button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <aside className="space-y-4">
          <div id="notifications" className="scroll-mt-6">
            <NotificationSettings />
          </div>
          <form action={updateReminderSettings} className="card space-y-3">
            <div>
              <h2 className="h2">{t("alerts.whenTitle")}</h2>
              <p className="text-xs text-muted">{t("alerts.whenHint")}</p>
            </div>
            <Field label={t("alerts.remindTasks")} name="remindTaskDays">
              <Select
                name="remindTaskDays"
                options={choices([1, 3, 7, 14, 30], (v) => t("alerts.daysBefore", { count: v }))}
                defaultValue={String(settings.remindTaskDays)}
                otherType="number"
                otherPlaceholder={t("alerts.daysBeforePlaceholder")}
              />
            </Field>
            <Field label={t("alerts.remindWarranties")} name="remindWarrantyDays">
              <Select
                name="remindWarrantyDays"
                options={choices([7, 14, 30, 60, 90], (v) => t("alerts.daysBefore", { count: v }))}
                defaultValue={String(settings.remindWarrantyDays)}
                otherType="number"
                otherPlaceholder={t("alerts.daysBeforePlaceholder")}
              />
            </Field>
            <Field label={t("alerts.remindLife")} name="remindLifeMonths">
              <Select
                name="remindLifeMonths"
                options={choices([3, 6, 12, 24], (v) => t("alerts.monthsBefore", { count: v }))}
                defaultValue={String(settings.remindLifeMonths)}
                otherType="number"
                otherPlaceholder={t("alerts.monthsBeforePlaceholder")}
              />
            </Field>
            <button className="btn w-full">{t("alerts.saveReminders")}</button>
          </form>
          <div className="card text-xs text-muted">
            {t("alerts.footnote")}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AlertRow({ t, alert: a, dot }: { t: Translator; alert: Alert; dot: string }) {
  return (
    <li className={`flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3 ${a.readAt ? "" : "bg-surface-2/40"}`}>
      <span className="mt-0.5 text-lg leading-none" aria-hidden="true">{KIND_ICON[a.kind] ?? "•"}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          {!a.readAt && <span className={`h-2 w-2 rounded-full ${dot}`} aria-label={t("alerts.unread")} />}
          <Link href={a.href} className={`hover:underline ${a.readAt ? "" : "font-semibold"}`}>{a.title}</Link>
        </div>
        <p className="text-sm text-muted">{a.message}</p>
        <p className="mt-0.5 text-xs text-muted">
          {kindLabel(t, a.kind)} · {t("alerts.raised", { date: t.date(a.createdAt) })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        <Link href={a.href} className="btn-secondary py-1.5">{t("common.open")}</Link>
        <form action={markAlertRead}>
          <Hidden name="alertId" value={a.id} />
          <button className="btn-link">{a.readAt ? t("alerts.markUnread") : t("alerts.markRead")}</button>
        </form>
        <form action={snoozeAlert}>
          <Hidden name="alertId" value={a.id} />
          <Hidden name="days" value="7" />
          <button className="btn-link" title={t("alerts.snoozeHint")}>{t("alerts.snooze")}</button>
        </form>
        <form action={dismissAlert}>
          <Hidden name="alertId" value={a.id} />
          <button className="text-sm text-muted hover:text-danger" title={t("alerts.dismiss")} aria-label={t("alerts.dismiss")}>✕</button>
        </form>
      </div>
    </li>
  );
}
