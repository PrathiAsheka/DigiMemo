import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { daysUntil } from "@/lib/format";
import { Empty, SectionHeader } from "@/components/ui";
import { NewTaskForm, TaskRow } from "../task-forms";

export default async function MaintenancePage({ params }: PageProps<"/properties/[id]/maintenance">) {
  const { id } = await params;
  const { user, property } = await requireProperty(id);

  const [tasks, assets, providers] = await Promise.all([
    db.maintenanceTask.findMany({
      where: { propertyId: property.id },
      orderBy: [{ active: "desc" }, { nextDueDate: "asc" }],
      include: { asset: { select: { name: true } } },
    }),
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } }),
    db.serviceProvider.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const active = tasks.filter((t) => t.active);
  const overdue = active.filter((t) => daysUntil(t.nextDueDate) < 0);
  const upcoming = active.filter((t) => daysUntil(t.nextDueDate) >= 0);
  const done = tasks.filter((t) => !t.active);

  const section = (title: string, list: typeof tasks, empty: string) => (
    <section className="card">
      <SectionHeader title={`${title} (${list.length})`} />
      {list.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((t) => <TaskRow key={t.id} task={t} providers={providers} assetName={t.asset?.name} />)}
        </ul>
      )}
    </section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {overdue.length > 0 && section("Overdue", overdue, "")}
        {section("Upcoming", upcoming, "Nothing scheduled. Add a recurring task like filter changes or gutter cleaning.")}
        {done.length > 0 && section("Completed one-off tasks", done, "")}
      </div>
      <aside>
        <NewTaskForm propertyId={property.id} assets={assets} />
      </aside>
    </div>
  );
}
