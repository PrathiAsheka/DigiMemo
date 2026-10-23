import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { COST_CATEGORIES, label, SAFETY_CRITICAL_CATEGORIES } from "@/lib/constants";
import { ageInYears, daysUntil, formatDate, formatMoney, toDateInput } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Input, SectionHeader, Select, statusTone } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { addCost, addWarranty, deleteAsset, deleteCost, deleteWarranty, updateAsset } from "../../../actions";
import { AssetFields } from "../asset-fields";
import { NewTaskForm, TaskRow } from "../../task-forms";

export default async function AssetPage({ params }: PageProps<"/properties/[id]/assets/[assetId]">) {
  const { id, assetId } = await params;
  const { user, property } = await requireProperty(id);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={base} className="text-xs text-muted hover:underline">← {property.name}</Link>
          <h2 className="mt-1 text-xl font-semibold">{asset.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{label(asset.category)}</span>
            {asset.space && <span>· {asset.space.name}</span>}
            {asset.manufacturer && <span>· {[asset.manufacturer, asset.model].filter(Boolean).join(" ")}</span>}
            {asset.serialNumber && <span className="font-mono text-xs">· S/N {asset.serialNumber}</span>}
            <Badge tone={statusTone(asset.status)}>{label(asset.status)}</Badge>
          </div>
        </div>
        <Link href={`/assistant?property=${property.id}&q=${encodeURIComponent(`Tell me about my ${asset.name}`)}`} className="btn-secondary">
          Ask the assistant
        </Link>
      </div>

      {SAFETY_CRITICAL_CATEGORIES.has(asset.category) && (
        <p className="rounded-lg border border-warn/40 px-4 py-3 text-sm text-warn">
          {label(asset.category)} systems can be hazardous. Use a qualified, licensed professional for inspection and repairs.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <div className="text-xs text-muted">Age</div>
          <div className="mt-1 text-lg font-semibold">{age != null ? `${age.toFixed(1)} yrs` : "—"}</div>
          {lifeLeft != null && (
            <div className={`text-xs ${lifeLeft <= 1 ? "text-warn" : "text-muted"}`}>
              {lifeLeft > 0 ? `~${lifeLeft.toFixed(1)} yrs of expected life left` : "Past expected life"}
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-xs text-muted">Warranty</div>
          <div className="mt-1 text-lg font-semibold">{activeWarranty ? formatDate(activeWarranty.endDate) : "None active"}</div>
          {activeWarranty && <div className="text-xs text-muted">{daysUntil(activeWarranty.endDate)} days left</div>}
        </div>
        <div className="card">
          <div className="text-xs text-muted">Purchased</div>
          <div className="mt-1 text-lg font-semibold">{formatDate(asset.purchaseDate)}</div>
          <div className="text-xs text-muted">{formatMoney(asset.purchasePrice)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">Total spend</div>
          <div className="mt-1 text-lg font-semibold">{formatMoney(totalSpend)}</div>
          <div className="text-xs text-muted">{asset.costRecords.length} records</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card">
            <SectionHeader title="Maintenance" />
            {asset.tasks.length === 0 ? (
              <Empty>No maintenance scheduled for this asset.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {asset.tasks.map((t) => <TaskRow key={t.id} task={t} providers={providers} />)}
              </ul>
            )}
          </section>

          <section className="card">
            <SectionHeader title="Service history">
              <Link href={`${base}/work-orders?asset=${asset.id}`} className="btn-link">New work order</Link>
            </SectionHeader>
            {asset.workOrders.length === 0 ? (
              <Empty>No service records yet.</Empty>
            ) : (
              <table className="table">
                <thead><tr><th>Work</th><th>By</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {asset.workOrders.map((w) => (
                    <tr key={w.id}>
                      <td>{w.title}{w.resolution && <div className="text-xs text-muted">{w.resolution}</div>}</td>
                      <td>{w.provider?.name ?? "—"}</td>
                      <td><Badge tone={statusTone(w.status)}>{label(w.status)}</Badge></td>
                      <td>{formatDate(w.completedAt ?? w.scheduledFor ?? w.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <SectionHeader title="Costs" />
            {asset.costRecords.length > 0 && (
              <table className="table mb-4">
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="text-right">Amount</th><th /></tr></thead>
                <tbody>
                  {asset.costRecords.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.date)}</td>
                      <td>{c.description ?? "—"}</td>
                      <td>{label(c.category)}</td>
                      <td className="text-right tabular-nums">{formatMoney(c.amount, c.currency)}</td>
                      <td className="text-right">
                        <form action={deleteCost}>
                          <Hidden name="propertyId" value={property.id} />
                          <Hidden name="costId" value={c.id} />
                          <ConfirmButton message="Delete this cost record?">×</ConfirmButton>
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
              <Field label="Date" name="date"><Input name="date" type="date" defaultValue={toDateInput(new Date())} /></Field>
              <Field label="Amount" name="amount"><Input name="amount" type="number" step="0.01" min={0} required /></Field>
              <Field label="Category" name="category"><Select name="category" options={COST_CATEGORIES} defaultValue="repair" /></Field>
              <Field label="Description" name="description"><Input name="description" /></Field>
              <button className="btn-secondary">Add</button>
            </form>
          </section>

          <section className="card">
            <SectionHeader title="Documents">
              <Link href={`${base}/documents?asset=${asset.id}`} className="btn-link">Upload</Link>
            </SectionHeader>
            {asset.documents.length === 0 ? (
              <Empty>No documents linked. Upload a receipt, manual or warranty card.</Empty>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {asset.documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2">
                    <a href={`/api/documents/${d.id}`} target="_blank" className="font-medium hover:underline">{d.filename}</a>
                    <span className="text-xs text-muted">{label(d.kind)}</span>
                    <span className="ml-auto text-xs text-muted">{formatDate(d.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="card">
            <summary className="h2 cursor-pointer">Edit details</summary>
            <form action={updateAsset} className="mt-4 space-y-4">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <AssetFields asset={asset} spaces={spaces} />
              <div className="flex items-center justify-between">
                <button className="btn">Save changes</button>
              </div>
            </form>
            <form action={deleteAsset} className="mt-4 border-t border-border pt-4">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <ConfirmButton message={`Delete ${asset.name} and its warranties? Documents and costs are kept.`}>Delete asset</ConfirmButton>
            </form>
          </details>
        </div>

        <aside className="space-y-4">
          <NewTaskForm propertyId={property.id} assetId={asset.id} />

          <div className="card space-y-3">
            <h2 className="h2">Warranties</h2>
            {asset.warranties.length === 0 && <p className="text-sm text-muted">None recorded.</p>}
            <ul className="space-y-2 text-sm">
              {asset.warranties.map((w) => {
                const d = daysUntil(w.endDate);
                return (
                  <li key={w.id} className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{w.provider ?? "Warranty"}</div>
                      <div className="text-xs text-muted">
                        {w.startDate ? `${formatDate(w.startDate)} – ` : "Until "}
                        {formatDate(w.endDate)} · {d >= 0 ? `${d} days left` : "expired"}
                      </div>
                      {w.terms && <div className="text-xs text-muted">{w.terms}</div>}
                    </div>
                    <form action={deleteWarranty}>
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="assetId" value={asset.id} />
                      <Hidden name="warrantyId" value={w.id} />
                      <ConfirmButton message="Delete this warranty?">×</ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
            <form action={addWarranty} className="space-y-2 border-t border-border pt-3">
              <Hidden name="propertyId" value={property.id} />
              <Hidden name="assetId" value={asset.id} />
              <Field label="Provider" name="provider"><Input name="provider" placeholder="e.g. Manufacturer" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Starts" name="startDate"><Input name="startDate" type="date" defaultValue={toDateInput(asset.purchaseDate)} /></Field>
                <Field label="Ends" name="endDate"><Input name="endDate" type="date" required /></Field>
              </div>
              <Field label="Terms" name="terms"><Input name="terms" placeholder="e.g. Parts & labour" /></Field>
              <button className="btn-secondary w-full">Add warranty</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
