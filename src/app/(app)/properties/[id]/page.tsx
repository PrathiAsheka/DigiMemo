import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { label, SPACE_KINDS } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Input, SectionHeader, Select, statusTone } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { createSpace, deleteSpace } from "../actions";

export default async function PropertyOverview({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const { property } = await requireProperty(id);

  const [spaces, assets] = await Promise.all([
    db.space.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" } }),
    db.asset.findMany({
      where: { propertyId: property.id },
      orderBy: { name: "asc" },
      include: { warranties: { orderBy: { endDate: "desc" }, take: 1 } },
    }),
  ]);

  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const groups = [
    ...spaces.map((s) => ({
      key: s.id,
      title: s.parentId ? `${spaceName.get(s.parentId)} → ${s.name}` : s.name,
      kind: s.kind,
      space: s,
      assets: assets.filter((a) => a.spaceId === s.id),
    })),
    { key: "none", title: "Not assigned to a space", kind: null, space: null, assets: assets.filter((a) => !a.spaceId) },
  ].filter((g) => g.space || g.assets.length > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-4">
        <SectionHeader title={`Assets (${assets.length})`}>
          <Link href={`/properties/${property.id}/assets/new`} className="btn">Add asset</Link>
        </SectionHeader>
        {groups.length === 0 && (
          <div className="card">
            <Empty>Add spaces and assets, or upload a receipt on the Documents tab to let AI create one.</Empty>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} className="card">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{g.title}</span>
                {g.kind && <span className="text-xs text-muted">{label(g.kind)}</span>}
              </div>
              {g.space && (
                <form action={deleteSpace}>
                  <Hidden name="propertyId" value={property.id} />
                  <Hidden name="spaceId" value={g.space.id} />
                  <ConfirmButton message={`Remove ${g.space.name}? Its assets will be kept but unassigned.`}>
                    Remove
                  </ConfirmButton>
                </form>
              )}
            </div>
            {g.assets.length === 0 ? (
              <p className="text-sm text-muted">No assets here yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {g.assets.map((a) => {
                  const w = a.warranties[0];
                  const wDays = w ? daysUntil(w.endDate) : null;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <Link href={`/properties/${property.id}/assets/${a.id}`} className="font-medium hover:underline">
                        {a.name}
                      </Link>
                      <span className="text-xs text-muted">
                        {[a.manufacturer, a.model].filter(Boolean).join(" ") || label(a.category)}
                      </span>
                      <span className="ml-auto flex gap-2">
                        {wDays != null &&
                          (wDays >= 0 ? (
                            <Badge tone={wDays <= 60 ? "warn" : "ok"}>Warranty to {formatDate(w!.endDate)}</Badge>
                          ) : (
                            <Badge>Warranty expired</Badge>
                          ))}
                        {a.status !== "active" && <Badge tone={statusTone(a.status)}>{label(a.status)}</Badge>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </section>

      <aside className="space-y-4">
        <form action={createSpace} className="card space-y-3">
          <h2 className="h2">Add a space</h2>
          <Hidden name="propertyId" value={property.id} />
          <Field label="Name" name="name">
            <Input name="name" required placeholder="e.g. Garage" />
          </Field>
          <Field label="Kind" name="kind">
            <Select name="kind" options={SPACE_KINDS} defaultValue="room" />
          </Field>
          {spaces.length > 0 && (
            <Field label="Inside" name="parentId">
              <Select
                name="parentId"
                emptyLabel="— (top level)"
                options={spaces.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
          )}
          <button className="btn w-full">Add space</button>
        </form>
      </aside>
    </div>
  );
}
