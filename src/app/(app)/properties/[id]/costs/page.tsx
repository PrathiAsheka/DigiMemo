import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { COST_CATEGORIES, label } from "@/lib/constants";
import { formatDate, formatMoney, toDateInput } from "@/lib/format";
import { Empty, Field, Hidden, Input, Select, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { addCost, deleteCost } from "../../actions";

export default async function CostsPage({ params }: PageProps<"/properties/[id]/costs">) {
  const { id } = await params;
  const { property } = await requireProperty(id);

  const [costs, assets] = await Promise.all([
    db.costRecord.findMany({
      where: { propertyId: property.id },
      orderBy: { date: "desc" },
      include: { asset: { select: { id: true, name: true } } },
    }),
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } }),
  ]);

  const year = new Date().getUTCFullYear();
  const thisYear = costs.filter((c) => c.date.getUTCFullYear() === year);
  const sum = (list: typeof costs) => list.reduce((s, c) => s + c.amount, 0);
  const maintenanceThisYear = sum(thisYear.filter((c) => c.category !== "purchase"));

  const byAsset = new Map<string, { name: string; total: number }>();
  for (const c of costs.filter((c) => c.category !== "purchase" && c.asset)) {
    const e = byAsset.get(c.asset!.id) ?? { name: c.asset!.name, total: 0 };
    e.total += c.amount;
    byAsset.set(c.asset!.id, e);
  }
  const topAssets = [...byAsset.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Maintenance & repairs ${year}`} value={formatMoney(maintenanceThisYear)} hint="Excludes purchases" />
        <Stat label={`All spend ${year}`} value={formatMoney(sum(thisYear))} />
        <Stat label="All-time tracked" value={formatMoney(sum(costs))} hint={`${costs.length} records`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card">
          {costs.length === 0 ? (
            <Empty>No costs recorded yet. Costs are added automatically when you record a service or purchase.</Empty>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Description</th><th>Asset</th><th>Category</th><th className="text-right">Amount</th><th /></tr></thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap">{formatDate(c.date)}</td>
                    <td>{c.description ?? "—"}</td>
                    <td>{c.asset ? <Link className="hover:underline" href={`/properties/${property.id}/assets/${c.asset.id}`}>{c.asset.name}</Link> : "—"}</td>
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
        </section>

        <aside className="space-y-4">
          {topAssets.length > 0 && (
            <div className="card">
              <h2 className="h2 mb-3">Highest upkeep</h2>
              <ul className="space-y-2 text-sm">
                {topAssets.map(([assetId, a]) => (
                  <li key={assetId} className="flex justify-between gap-2">
                    <span>{a.name}</span>
                    <span className="tabular-nums text-muted">{formatMoney(a.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form action={addCost} className="card space-y-3">
            <h2 className="h2">Add a cost</h2>
            <Hidden name="propertyId" value={property.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" name="date"><Input name="date" type="date" defaultValue={toDateInput(new Date())} /></Field>
              <Field label="Amount (USD)" name="amount"><Input name="amount" type="number" step="0.01" min={0} required /></Field>
            </div>
            <Field label="Category" name="category"><Select name="category" options={COST_CATEGORIES} defaultValue="repair" /></Field>
            <Field label="Asset" name="assetId"><Select name="assetId" emptyLabel="— Whole property" options={assets.map((a) => ({ value: a.id, label: a.name }))} /></Field>
            <Field label="Description" name="description"><Input name="description" /></Field>
            <button className="btn w-full">Add cost</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
