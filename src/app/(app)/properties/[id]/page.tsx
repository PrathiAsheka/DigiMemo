import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { SPACE_KINDS } from "@/lib/constants";
import { daysUntil } from "@/lib/format";
import { getProfile, profileForPropertyType } from "@/lib/profiles";
import { alreadyHas, templateForSpace, tn } from "@/lib/space-templates";
import { coverPhoto } from "@/lib/documents";
import { Badge, Empty, Field, Hidden, Input, SectionHeader, Select, statusTone } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { getT } from "@/i18n/server";
import { addSuggestedAssets, addTemplateSpace, createSpace, deleteSpace } from "../actions";

export default async function PropertyOverview({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  const [{ user, property }, t] = await Promise.all([requireProperty(id), getT()]);
  const profile = profileForPropertyType(property.type, getProfile(user.useCase, t.locale));
  const name = (x: { en: string; si: string }) => tn(x, t.locale);

  const [spaces, assets] = await Promise.all([
    db.space.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" } }),
    db.asset.findMany({
      where: { propertyId: property.id },
      orderBy: { name: "asc" },
      include: {
        warranties: { orderBy: { endDate: "desc" }, take: 1 },
        // Product photos, so the item's thumbnail can be shown.
        documents: { where: { kind: "photo" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, caption: true } },
      },
    }),
  ]);

  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const root = profile.noun.charAt(0).toUpperCase() + profile.noun.slice(1);
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
        suggestions: (template?.assets ?? []).filter((x) => !alreadyHas(have, x)),
      };
    }),
    {
      key: "none",
      path: [t("overview.notAssigned")],
      kind: null,
      space: null,
      assets: assets.filter((a) => !a.spaceId),
      suggestions: [],
    },
  ].filter((g) => g.space || g.assets.length > 0);

  // Typical rooms for this kind of place that the user hasn't added yet.
  const presentTemplates = new Set(spaces.map((s) => templateForSpace(s.name, profile.spaces)?.en).filter(Boolean));
  const missingRooms = profile.spaces.filter((room) => !presentTemplates.has(room.en));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-4">
        <SectionHeader title={t("overview.equipmentCount", { count: assets.length })}>
          <Link href={`/properties/${property.id}/assets/new`} className="btn">{t("dashboard.addEquipment")}</Link>
        </SectionHeader>
        {groups.length === 0 && (
          <div className="card">
            <Empty>{t("overview.empty")}</Empty>
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
                {g.kind && <span className="ml-1 text-xs text-muted">{t.label(g.kind)}</span>}
              </div>
              {g.space && (
                <form action={deleteSpace}>
                  <Hidden name="propertyId" value={property.id} />
                  <Hidden name="spaceId" value={g.space.id} />
                  <ConfirmButton message={t("overview.removeRoomConfirm", { name: g.space.name })}>{t("common.remove")}</ConfirmButton>
                </form>
              )}
            </div>

            {g.assets.length === 0 ? (
              <p className="py-1 text-sm text-muted">{t("overview.nothingHere")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {g.assets.map((a) => {
                  const w = a.warranties[0];
                  const wDays = w ? daysUntil(w.endDate) : null;
                  const needsDetails = !a.manufacturer && !a.model && !a.purchaseDate && !a.installDate;
                  const cover = coverPhoto(a.documents);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/documents/${cover.id}`} alt="" loading="lazy" className="h-9 w-9 rounded-md border border-border object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-xs text-muted" aria-hidden="true">
                          {a.name.charAt(0)}
                        </span>
                      )}
                      <Link href={`/properties/${property.id}/assets/${a.id}`} className="font-medium hover:underline">
                        {a.name}
                      </Link>
                      <span className="text-xs text-muted">{[a.manufacturer, a.model].filter(Boolean).join(" ") || t.label(a.category)}</span>
                      <span className="ml-auto flex gap-2">
                        {needsDetails && (
                          <Link href={`/properties/${property.id}/assets/${a.id}`} className="badge bg-surface-2 text-accent hover:underline">
                            {t("overview.addDetails")}
                          </Link>
                        )}
                        {wDays != null &&
                          (wDays >= 0 ? (
                            <Badge tone={wDays <= 60 ? "warn" : "ok"}>{t("overview.warrantyTo", { date: t.date(w!.endDate) })}</Badge>
                          ) : (
                            <Badge>{t("overview.warrantyExpired")}</Badge>
                          ))}
                        {a.status !== "active" && <Badge tone={statusTone(a.status)}>{t.label(a.status)}</Badge>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {g.space && g.suggestions.length > 0 && (
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted">{t("overview.usuallyIn", { room: g.space.name })}</span>
                  {g.suggestions.length > 1 && (
                    <form action={addSuggestedAssets}>
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="spaceId" value={g.space.id} />
                      {g.suggestions.map((s) => <Hidden key={s.en} name="asset" value={s.en} />)}
                      <button className="btn-link text-xs">{t("overview.addAll")}</button>
                    </form>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.suggestions.map((s) => (
                    <form key={s.en} action={addSuggestedAssets}>
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="spaceId" value={g.space!.id} />
                      <Hidden name="asset" value={s.en} />
                      <button
                        className="rounded-full border border-dashed border-accent/50 px-3 py-1 text-sm text-accent hover:border-solid hover:bg-ok-bg"
                        title={t("overview.addItemTo", { item: name(s), room: g.space!.name })}
                      >
                        + {name(s)}
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
              <h2 className="h2">{profile.id === "company" ? t("overview.addTypicalArea") : t("overview.addTypicalRoom")}</h2>
              <p className="text-xs text-muted">{t("overview.thenPick")}</p>
            </div>
            <ul className="space-y-2">
              {missingRooms.map((room) => (
                <li key={room.en}>
                  <form action={addTemplateSpace} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <Hidden name="propertyId" value={property.id} />
                    <Hidden name="template" value={room.en} />
                    <span className="min-w-0 text-sm">
                      {name(room)}
                      <span className="block truncate text-xs text-muted">{room.assets.map(name).join(" / ")}</span>
                    </span>
                    <button className="btn-link shrink-0">+ {t("common.add")}</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={createSpace} className="card space-y-3">
          <h2 className="h2">{t("overview.addOwn")}</h2>
          <Hidden name="propertyId" value={property.id} />
          <Field label={t("common.name")} name="name">
            <Input name="name" required placeholder={profile.id === "company" ? t("overview.ownPlaceholderCompany") : t("overview.ownPlaceholder")} />
          </Field>
          <Field label={t("overview.kind")} name="kind">
            <Select name="kind" options={SPACE_KINDS} defaultValue="room" />
          </Field>
          {spaces.length > 0 && (
            <Field label={t("overview.inside")} name="parentId">
              <Select
                name="parentId"
                emptyLabel={t("overview.topLevel")}
                options={spaces.map((s) => ({ value: s.id, label: s.name }))}
                otherPlaceholder={t("overview.newParent")}
              />
            </Field>
          )}
          <button className="btn w-full">{t("common.add")}</button>
          <p className="text-xs text-muted">{t("overview.ownHint")}</p>
        </form>
      </aside>
    </div>
  );
}
