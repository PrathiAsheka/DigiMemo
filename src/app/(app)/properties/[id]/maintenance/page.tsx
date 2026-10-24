import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysUntil } from "@/lib/format";
import { getProfile, profileForPropertyType } from "@/lib/profiles";
import { Empty, Hidden, SectionHeader } from "@/components/ui";
import { getT } from "@/i18n/server";
import { createTask } from "../../maintenance-actions";
import { intervalLabel, NewTaskForm, TaskRow } from "../task-forms";

export default async function MaintenancePage({ params }: PageProps<"/properties/[id]/maintenance">) {
  const { id } = await params;
  const [{ user, property }, t] = await Promise.all([requireProperty(id), getT()]);

  const [tasks, assets, providers] = await Promise.all([
    db.maintenanceTask.findMany({
      where: { propertyId: property.id },
      orderBy: [{ active: "desc" }, { nextDueDate: "asc" }],
      include: { asset: { select: { name: true } } },
    }),
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } }),
    db.serviceProvider.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const profile = profileForPropertyType(property.type, getProfile(user.useCase, t.locale));
  // Hide suggestions the user already has (loosely: "Flush water heater" matches "Flush water heater tank").
  const existing = tasks.filter((task) => task.active).map((task) => task.title.toLowerCase());
  const suggestions = profile.taskSuggestions.filter((s) => {
    const title = s.title.toLowerCase();
    return !existing.some((e) => e.includes(title) || title.includes(e));
  });

  const active = tasks.filter((task) => task.active);
  const overdue = active.filter((task) => daysUntil(task.nextDueDate) < 0);
  const upcoming = active.filter((task) => daysUntil(task.nextDueDate) >= 0);
  const done = tasks.filter((task) => !task.active);

  const section = (title: string, list: typeof tasks, empty: string) => (
    <section className="card">
      <SectionHeader title={`${title} (${list.length})`} />
      {list.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((task) => <TaskRow key={task.id} task={task} providers={providers} assetName={task.asset?.name} />)}
        </ul>
      )}
    </section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {overdue.length > 0 && section(t("maintenance.overdue"), overdue, "")}
        {section(t("maintenance.upcoming"), upcoming, t("maintenance.emptyUpcoming"))}
        {done.length > 0 && section(t("maintenance.completedOneOff"), done, "")}
      </div>
      <aside className="space-y-4">
        {suggestions.length > 0 && (
          <div className="card space-y-3">
            <div>
              <h2 className="h2">{t("maintenance.suggestedFor", { aNoun: profile.aNoun })}</h2>
              <p className="text-xs text-muted">{t("maintenance.suggestedHint")}</p>
            </div>
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s.title}>
                  <form action={createTask} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <Hidden name="propertyId" value={property.id} />
                    <Hidden name="title" value={s.title} />
                    {s.intervalDays && <Hidden name="intervalDays" value={String(s.intervalDays)} />}
                    <span className="text-sm">
                      {s.title}
                      <span className="block text-xs text-muted">{intervalLabel(t, s.intervalDays)}</span>
                    </span>
                    <button className="btn-link shrink-0">+ {t("common.add")}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
        <NewTaskForm propertyId={property.id} assets={assets} />
      </aside>
    </div>
  );
}
