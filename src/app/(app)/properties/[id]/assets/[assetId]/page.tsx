import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { COST_CATEGORIES, SAFETY_CRITICAL_CATEGORIES } from "@/lib/constants";
import { ageInYears, daysUntil, toDateInput } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Input, SectionHeader, Select, statusTone } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { getT } from "@/i18n/server";
import { addCost, addWarranty, deleteAsset, deleteCost, deleteWarranty, updateAsset } from "../../../actions";
import { AssetFields } from "../asset-fields";
import { NewTaskForm, TaskRow } from "../../task-forms";
import { aiConfigured } from "@/lib/ai/client";
import { deleteAssetPhoto } from "../../../photo-actions";
import { PhotoUpload } from "./photo-upload";
import { coverPhoto } from "@/lib/documents";

export default async function AssetPage({ params }: PageProps<"/properties/[id]/assets/[assetId]">) {
  const { id, assetId } = await params;
  const [{ user, property }, t] = await Promise.all([requireProperty(id), getT()]);

  const asset = await db.asset.findFirst({
    where: { id: assetId, propertyId: property.id },
    include: {
      space: true,
      warranties: { orderBy: { endDate: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: [{ active: "desc" }, { nextDueDate: "asc" }] },
      workOrders: { orderBy: { createdAt: "desc" }, include: { provider: true } },
      costRecords: { orderBy: { date: "desc" } },
    },
  });
  if (!asset) notFound();

  const [spaces, providers] = await Promise.all([
    db.space.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } }),
    db.serviceProvider.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const age = ageInYears(asset.installDate ?? asset.purchaseDate);
  const lifeLeft = age != null && asset.expectedLifeYears ? asset.expectedLifeYears - age : null;
  const totalSpend = asset.costRecords.reduce((s, c) => s + c.amount, 0);
  const activeWarranty = asset.warranties.find((w) => daysUntil(w.endDate) >= 0);
  const base = `/properties/${property.id}`;
  const photos = asset.documents.filter((d) => d.kind === "photo");
  const otherDocs = asset.documents.filter((d) => d.kind !== "photo");
  const cover = coverPhoto(photos);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
        {cover ? (
          <a href={`/api/documents/${cover.id}`} target="_blank" className="block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/documents/${cover.id}`} alt={cover.caption ?? asset.name} className="h-20 w-20 rounded-xl border border-border object-cover" />
          </a>
        ) : (
          <a href="#photos" className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-accent/50 text-center text-xs text-accent hover:bg-surface-2">
            <span className="text-xl" aria-hidden="true">📷</span>
            {t("assets.addPhoto")}
          </a>
        )}
        <div>
          <Link href={base} className="text-xs text-muted hover:underline">← {property.name}</Link>
          <h2 className="mt-1 text-xl font-semibold">{asset.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{t.label(asset.category)}</span>
            {asset.space && <span>· {asset.space.name}</span>}
            {asset.manufacturer && <span>· {[asset.manufacturer, asset.model].filter(Boolean).join(" ")}</span>}
            {asset.serialNumber && <span className="font-mono text-xs">· S/N {asset.serialNumber}</span>}
            <Badge tone={statusTone(asset.status)}>{t.label(asset.status)}</Badge>
          </div>
        </div>
        </div>
        <Link href={`${base}/work-orders?asset=${asset.id}`} className="btn-secondary">
          {t("assets.reportProblem")}
        </Link>
      </div>

      {SAFETY_CRITICAL_CATEGORIES.has(asset.category) && (
        <p className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">
          {t("assets.safetyWarning", { category: t.label(asset.category) })}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <div className="text-xs text-muted">{t("assets.age")}</div>
          <div className="mt-1 text-lg font-semibold">{age != null ? t("assets.years", { years: age.toFixed(1) }) : "—"}</div>
          {lifeLeft != null && (
            <div className={`text-xs ${lifeLeft <= 1 ? "text-warn" : "text-muted"}`}>
              {lifeLeft > 0 ? t("dashboard.lifeLeft", { years: lifeLeft.toFixed(1) }) : t("dashboard.pastLife")}
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t("enum.warranty")}</div>
          <div className="mt-1 text-lg font-semibold">{activeWarranty ? t.date(activeWarranty.endDate) : t("assets.noneActive")}</div>
          {activeWarranty && <div className="text-xs text-muted">{t("assets.daysLeft", { count: daysUntil(activeWarranty.endDate) })}</div>}
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t("assets.purchased")}</div>
          <div className="mt-1 text-lg font-semibold">{t.date(asset.purchaseDate)}</div>
          <div className="text-xs text-muted">{t.money(asset.purchasePrice)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t("assets.totalSpend")}</div>
          <div className="mt-1 text-lg font-semibold">{t.money(totalSpend)}</div>
          <div className="text-xs text-muted">{t("costs.records", { count: asset.costRecords.length })}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card scroll-mt-6" id="photos">
            <SectionHeader title={t("photos.title", { count: photos.length })} />
            {photos.length === 0 ? (
              <Empty>{t("photos.empty")}</Empty>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <li key={p.id} className="group overflow-hidden rounded-lg border border-border">
                    <a href={`/api/documents/${p.id}`} target="_blank" className="block aspect-square bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/documents/${p.id}`} alt={p.caption ?? p.filename} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    </a>
                    <div className="flex items-start justify-between gap-2 p-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{p.caption ?? t("enum.photo")}</div>
                        <div className="text-[11px] text-muted">{t.date(p.createdAt)}</div>
                      </div>
                      <form action={deleteAssetPhoto}>
                        <Hidden name="documentId" value={p.id} />
                        <ConfirmButton message={t("photos.deleteConfirm")} className="text-xs text-muted hover:text-danger">✕</ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <SectionHeader title={t("tabs.maintenance")} />
            {asset.tasks.length === 0 ? (
              <Empty>{t("assets.noMaintenance")}</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {asset.tasks.map((task) => <TaskRow key={task.id} task={task} providers={providers} />)}
              </ul>
            )}
          </section>

          <section className="card">
            <SectionHeader title={t("assets.serviceHistory")}>
              <Link href={`${base}/work-orders?asset=${asset.id}`} className="btn-link">{t("dashboard.newWorkOrder")}</Link>
            </SectionHeader>
            {asset.workOrders.length === 0 ? (
              <Empty>{t("assets.noService")}</Empty>
            ) : (
              <table className="table">
                <thead><tr><th>{t("workOrders.work")}</th><th>{t("workOrders.by")}</th><th>{t("common.status")}</th><th>{t("common.date")}</th></tr></thead>
                <tbody>
                  {asset.workOrders.map((w) => (
                    <tr key={w.id}>
                      <td>{w.title}{w.resolution && <div className="text-xs text-muted">{w.resolution}</div>}</td>
                      <td>{w.provider?.name ?? "—"}</td>
                      <td><Badge tone={statusTone(w.status)}>{t.label(w.status)}</Badge></td>
                      <td>{t.date(w.completedAt ?? w.scheduledFor ?? w.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <SectionHeader title={t("tabs.costs")} />
            {asset.costRecords.length > 0 && (
              <table className="table mb-4">
                <thead><tr><th>{t("common.date")}</th><th>{t("common.description")}</th><th>{t("common.category")}</th><th className="text-right">{t("common.amount")}</th><th /></tr></thead>
                <tbody>
                  {asset.costRecords.map((c) => (
                    <tr key={c.id}>
                      <td>{t.date(c.date)}</td>
                      <td>{c.description ?? "—"}</td>
                      <td>{t.label(c.category)}</td>
                      <td className="text-right tabular-nums">{t.money(c.amount, c.currency)}</td>
                      <td className="text-right">
                        <form action={deleteCost}>
                          <Hidden name="propertyId" value={property.id} />
                          <Hidden name="costId" value={c.id} />
                          <ConfirmButton message={t("costs.deleteConfirm")}>×</ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form action={addCost} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_2fr_auto] sm:items-end">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <Field label={t("common.date")} name="date"><Input name="date" type="date" defaultValue={toDateInput(new Date())} /></Field>
              <Field label={t("common.amount")} name="amount"><Input name="amount" type="number" step="0.01" min={0} required /></Field>
              <Field label={t("common.category")} name="category"><Select name="category" options={COST_CATEGORIES} defaultValue="repair" /></Field>
              <Field label={t("common.description")} name="description"><Input name="description" /></Field>
              <button className="btn-secondary">{t("common.add")}</button>
            </form>
          </section>

          <section className="card">
            <SectionHeader title={t("tabs.documents")}>
              <Link href={`${base}/documents?asset=${asset.id}`} className="btn-link">{t("assets.upload")}</Link>
            </SectionHeader>
            {otherDocs.length === 0 ? (
              <Empty>{t("assets.noDocuments")}</Empty>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {otherDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2">
                    <a href={`/api/documents/${d.id}`} target="_blank" className="font-medium hover:underline">{d.filename}</a>
                    <span className="text-xs text-muted">{t.label(d.kind)}</span>
                    <span className="ml-auto text-xs text-muted">{t.date(d.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="card">
            <summary className="h2 cursor-pointer">{t("assets.editDetails")}</summary>
            <form action={updateAsset} className="mt-4 space-y-4">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <AssetFields asset={asset} spaces={spaces} />
              <div className="flex items-center justify-between">
                <button className="btn">{t("common.saveChanges")}</button>
              </div>
            </form>
            <form action={deleteAsset} className="mt-4 border-t border-border pt-4">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <ConfirmButton message={t("assets.deleteConfirm", { name: asset.name })}>{t("assets.delete")}</ConfirmButton>
            </form>
          </details>
        </div>

        <aside className="space-y-4">
          <PhotoUpload propertyId={property.id} assetId={asset.id} aiEnabled={aiConfigured()} />
          <NewTaskForm propertyId={property.id} assetId={asset.id} />

          <div className="card space-y-3">
            <h2 className="h2">{t("assets.warranties")}</h2>
            {asset.warranties.length === 0 && <p className="text-sm text-muted">{t("assets.noneRecorded")}</p>}
            <ul className="space-y-2 text-sm">
              {asset.warranties.map((w) => {
                const d = daysUntil(w.endDate);
                return (
                  <li key={w.id} className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{w.provider ?? t("enum.warranty")}</div>
                      <div className="text-xs text-muted">
                        {w.startDate
                          ? `${t.date(w.startDate)} – ${t.date(w.endDate)}`
                          : t("assets.until", { date: t.date(w.endDate) })}
                        {" · "}
                        {d >= 0 ? t("assets.daysLeft", { count: d }) : t("assets.expired")}
                      </div>
                      {w.terms && <div className="text-xs text-muted">{w.terms}</div>}
                    </div>
                    <form action={deleteWarranty}>
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="assetId" value={asset.id} />
                      <Hidden name="warrantyId" value={w.id} />
                      <ConfirmButton message={t("assets.deleteWarrantyConfirm")}>×</ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
            <form action={addWarranty} className="space-y-2 border-t border-border pt-3">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <Field label={t("common.provider")} name="provider"><Input name="provider" placeholder={t("assets.warrantyProviderPlaceholder")} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t("assets.starts")} name="startDate"><Input name="startDate" type="date" defaultValue={toDateInput(asset.purchaseDate)} /></Field>
                <Field label={t("assets.ends")} name="endDate"><Input name="endDate" type="date" required /></Field>
              </div>
              <Field label={t("assets.terms")} name="terms"><Input name="terms" placeholder={t("assets.termsPlaceholder")} /></Field>
              <button className="btn-secondary w-full">{t("assets.addWarranty")}</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
