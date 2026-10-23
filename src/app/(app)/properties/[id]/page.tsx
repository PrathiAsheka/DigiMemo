import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { label, SPACE_KINDS } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import { capitalize, getProfile, profileForPropertyType, withArticle } from "@/lib/profiles";
import { alreadyHas, templateForSpace } from "@/lib/space-templates";
import { coverPhoto } from "@/lib/documents";
import { Badge, Empty, Field, Hidden, Input, SectionHeader, Select, statusTone } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { addSuggestedAssets, addTemplateSpace, createSpace, deleteSpace } from "../actions";

export default async function PropertyOverview({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const { user, property } = await requireProperty(id);
  const profile = profileForPropertyType(property.type, getProfile(user.useCase));

  const [spaces, assets] = await Promise.all([
    db.space.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" } }),
    db.asset.findMany({
      where: { propertyId: property.id },
      orderBy: { name: "asc" },
      include: {
        warranties: { orderBy: { endDate: "desc" }, take: 1 },
        // Latest product photo, shown as a thumbnail so items are easy to recognise.
        documents: { where: { kind: "photo" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, caption: true } },
      },
    }),
  ]);

  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const root = capitalize(profile.noun);
  const groups = [
    ...spaces.map((s) => {
      const inSpace = assets.filter((a) => a.spaceId === s.id);
      const have = inSpace.map((a) => a.name);
      const template = templateForSpace(s.name, profile.spaces);
      return {
        key: s.id,
        path: s.parentId ? [root, spaceName.get(s.parentId)!, s.name] : [root, s.name],
        kind: s.kind,
        space: s,
        assets: inSpace,
        suggestions: (template?.assets ?? []).filter((x) => !alreadyHas(have, x.name)),
      };
    }),
    {
      key: "none",
      path: ["Not assigned to a room"],
      kind: null,
      space: null,
      assets: assets.filter((a) => !a.spaceId),
      suggestions: [],
    },
  ].filter((g) => g.space || g.assets.length > 0);

  // Typical rooms for this kind of place that the user hasn't added yet.
  const presentTemplates = new Set(spaces.map((s) => templateForSpace(s.name, profile.spaces)?.name).filter(Boolean));
  const missingRooms = profile.spaces.filter((t) => !presentTemplates.has(t.name));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-4">
        <SectionHeader title={`Equipment (${assets.length})`}>
          <Link href={`/properties/${property.id}/assets/new`} className="btn">Add equipment</Link>
        </SectionHeader>
        {groups.length === 0 && (
          <div className="card">
            <Empty>Add a room on the right, then pick the equipment in it.</Empty>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} className="card">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                {g.path.map((part, i) => (
                  <span key={i} className={i === g.path.length - 1 ? "text-base font-semibold" : "text-muted"}>
                    {part}
                    {i < g.path.length - 1 && <span className="ml-1.5 text-muted">→</span>}
                  </span>
                ))}
                {g.kind && <span className="ml-1 text-xs text-muted">{label(g.kind)}</span>}
              </div>
              {g.space && (
                <form action={deleteSpace}>
                  <Hidden name="propertyId" value={property.id} />
                  <Hidden name="spaceId" value={g.space.id} />
                  <ConfirmButton message={`Remove ${g.space.name}? Its equipment will be kept but unassigned.`}>
                    Remove
                  </ConfirmButton>
                </form>
              )}
            </div>

            {g.assets.length === 0 ? (
              <p className="py-1 text-sm text-muted">Nothing added here yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {g.assets.map((a) => {
                  const w = a.warranties[0];
                  const wDays = w ? daysUntil(w.endDate) : null;
                  const needsDetails = !a.manufacturer && !a.model && !a.purchaseDate && !a.installDate;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      {coverPhoto(a.documents) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/documents/${coverPhoto(a.documents)!.id}`} alt="" loading="lazy" className="h-9 w-9 rounded-md border border-border object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-xs text-muted" aria-hidden="true">
                          {a.name.charAt(0)}
                        </span>
                      )}
                      <Link href={`/properties/${property.id}/assets/${a.id}`} className="font-medium hover:underline">
                        {a.name}
                      </Link>
                      <span className="text-xs text-muted">
                        {[a.manufacturer, a.model].filter(Boolean).join(" ") || label(a.category)}
                      </span>
                      <span className="ml-auto flex gap-2">
                        {needsDetails && (
                          <Link href={`/properties/${property.id}/assets/${a.id}`} className="badge bg-surface-2 text-accent hover:underline">
                            Add details
                          </Link>
                        )}
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

            {g.space && g.suggestions.length > 0 && (
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted">Usually found in {withArticle(g.space.name.toLowerCase())}</span>
                  {g.suggestions.length > 1 && (
                    <form action={addSuggestedAssets}>
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="spaceId" value={g.space.id} />
                      {g.suggestions.map((s) => <Hidden key={s.name} name="asset" value={s.name} />)}
                      <button className="btn-link text-xs">Add all</button>
                    </form>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.suggestions.map((s) => (
                    <form key={s.name} action={addSuggestedAssets}>
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="spaceId" value={g.space!.id} />
                      <Hidden name="asset" value={s.name} />
                      <button
                        className="rounded-full border border-dashed border-accent/50 px-3 py-1 text-sm text-accent hover:border-solid hover:bg-ok-bg"
                        title={`Add ${s.name} to ${g.space!.name}`}
                      >
                        + {s.name}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <aside className="space-y-4">
        {missingRooms.length > 0 && (
          <div className="card space-y-3">
            <div>
              <h2 className="h2">Add a typical {profile.id === "company" ? "area" : "room"}</h2>
              <p className="text-xs text-muted">Then pick what&apos;s in it from the suggestions.</p>
            </div>
            <ul className="space-y-2">
              {missingRooms.map((t) => (
                <li key={t.name}>
                  <form action={addTemplateSpace} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <Hidden name="propertyId" value={property.id} />
                    <Hidden name="template" value={t.name} />
                    <span className="min-w-0 text-sm">
                      {t.name}
                      <span className="block truncate text-xs text-muted">{t.assets.map((x) => x.name).join(" / ")}</span>
                    </span>
                    <button className="btn-link shrink-0">+ Add</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={createSpace} className="card space-y-3">
          <h2 className="h2">Add your own</h2>
          <Hidden name="propertyId" value={property.id} />
          <Field label="Name" name="name">
            <Input name="name" required placeholder={profile.id === "company" ? "e.g. Warehouse" : "e.g. Garage"} />
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
              otherPlaceholder="New parent area, e.g. First floor" />
            </Field>
          )}
          <button className="btn w-full">Add</button>
          <p className="text-xs text-muted">Equipment suggestions also appear for rooms you name yourself, like “Master bedroom” or “Garage”.</p>
        </form>
      </aside>
    </div>
  );
}
