import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { label, WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES } from "@/lib/constants";
import { formatDate, toDateInput } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Input, SectionHeader, Select, statusTone, TextArea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { createWorkOrder, deleteWorkOrder, updateWorkOrder } from "../../maintenance-actions";

export default async function WorkOrdersPage({ params, searchParams }: PageProps<"/properties/[id]/work-orders">) {
  const { id } = await params;
  const { asset: presetAsset } = await searchParams;
  const { user, property } = await requireProperty(id);

  const [orders, assets, providers] = await Promise.all([
    db.workOrder.findMany({
      where: { propertyId: property.id },
      orderBy: [{ createdAt: "desc" }],
      include: { asset: { select: { name: true } }, provider: { select: { name: true } }, costRecords: true },
    }),
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } }),
    db.serviceProvider.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const open = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const closed = orders.filter((o) => o.status === "completed" || o.status === "cancelled");
  const providerOptions = providers.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="card">
          <SectionHeader title={`Open (${open.length})`} />
          {open.length === 0 ? (
            <Empty>No open work orders.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((o) => (
                <li key={o.id} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-medium">{o.title}</span>
                    {o.asset && <span className="text-xs text-muted">{o.asset.name}</span>}
                    <span className="ml-auto flex gap-2">
                      {o.priority !== "normal" && <Badge tone={statusTone(o.priority)}>{label(o.priority)}</Badge>}
                      <Badge tone={statusTone(o.status)}>{label(o.status)}</Badge>
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {o.provider ? `Assigned to ${o.provider.name}` : "Unassigned"}
                    {o.scheduledFor && ` · scheduled ${formatDate(o.scheduledFor)}`}
                  </div>
                  {o.description && <p className="mt-1 text-sm text-muted">{o.description}</p>}
                  <details className="mt-2">
                    <summary className="btn-link cursor-pointer list-none">Update…</summary>
                    <form action={updateWorkOrder} className="mt-3 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="workOrderId" value={o.id} />
                      <Field label="Status" name="status" id={`status-${o.id}`}><Select name="status" id={`status-${o.id}`} options={WORK_ORDER_STATUSES} defaultValue={o.status} /></Field>
                      <Field label="Priority" name="priority" id={`priority-${o.id}`}><Select name="priority" id={`priority-${o.id}`} options={WORK_ORDER_PRIORITIES} defaultValue={o.priority} /></Field>
                      <Field label="Provider" name="providerId" id={`providerId-${o.id}`}><Select name="providerId" id={`providerId-${o.id}`} emptyLabel="— Unassigned" options={providerOptions} defaultValue={o.providerId} /></Field>
                      <Field label="Scheduled for" name="scheduledFor" id={`scheduledFor-${o.id}`}><Input name="scheduledFor" id={`scheduledFor-${o.id}`} type="date" defaultValue={toDateInput(o.scheduledFor)} /></Field>
                      <Field label="Cost to add (USD)" name="cost" id={`cost-${o.id}`}><Input name="cost" id={`cost-${o.id}`} type="number" step="0.01" min={0} /></Field>
                      <Field label="Resolution notes" name="resolution" id={`resolution-${o.id}`}><Input name="resolution" id={`resolution-${o.id}`} defaultValue={o.resolution ?? ""} /></Field>
                      <div className="sm:col-span-3"><button className="btn">Save</button></div>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <SectionHeader title={`History (${closed.length})`} />
          {closed.length === 0 ? (
            <Empty>Completed work and service visits appear here.</Empty>
          ) : (
            <table className="table">
              <thead><tr><th>Work</th><th>Asset</th><th>By</th><th>Date</th><th className="text-right">Cost</th><th /></tr></thead>
              <tbody>
                {closed.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.title} {o.status === "cancelled" && <Badge>Cancelled</Badge>}
                      {o.resolution && <div className="text-xs text-muted">{o.resolution}</div>}
                    </td>
                    <td>{o.asset?.name ?? "—"}</td>
                    <td>{o.provider?.name ?? "—"}</td>
                    <td>{formatDate(o.completedAt ?? o.updatedAt)}</td>
                    <td className="text-right tabular-nums">
                      {o.costRecords.length ? `$${o.costRecords.reduce((s, c) => s + c.amount, 0).toFixed(2)}` : "—"}
                    </td>
                    <td className="text-right">
                      <form action={deleteWorkOrder}>
                        <Hidden name="propertyId" value={property.id} />
                        <Hidden name="workOrderId" value={o.id} />
                        <ConfirmButton message="Delete this record?">×</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <aside>
        <form action={createWorkOrder} className="card space-y-3">
          <h2 className="h2">New work order</h2>
          <Hidden name="propertyId" value={property.id} />
          <Field label="What needs doing" name="title"><Input name="title" required placeholder="e.g. Dishwasher not draining" /></Field>
          <Field label="Asset" name="assetId">
            <Select name="assetId" emptyLabel="— Whole property" options={assets.map((a) => ({ value: a.id, label: a.name }))} defaultValue={typeof presetAsset === "string" ? presetAsset : undefined} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority" name="priority"><Select name="priority" options={WORK_ORDER_PRIORITIES} defaultValue="normal" /></Field>
            <Field label="Scheduled for" name="scheduledFor"><Input name="scheduledFor" type="date" /></Field>
          </div>
          <Field label="Provider" name="providerId"><Select name="providerId" emptyLabel="— Unassigned" options={providerOptions} /></Field>
          <Field label="Details" name="description"><TextArea name="description" rows={2} /></Field>
          <button className="btn w-full">Create work order</button>
        </form>
      </aside>
    </div>
  );
}
