import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { COST_CATEGORIES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { Empty, Field, Hidden, Input, Select, Stat } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { getT } from "@/i18n/server";
import { addCost, deleteCost } from "../../actions";

export default async function CostsPage({ params }: PageProps<"/properties/[id]/costs">) {
  const { id } = await params;
  const [{ property }, t] = await Promise.all([requireProperty(id), getT()]);

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
        <Stat label={t("costs.maintenanceYear", { year })} value={t.money(maintenanceThisYear)} hint={t("costs.excludesPurchases")} />
        <Stat label={t("costs.allSpendYear", { year })} value={t.money(sum(thisYear))} />
        <Stat label={t("costs.allTime")} value={t.money(sum(costs))} hint={t("costs.records", { count: costs.length })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-x-auto">
          {costs.length === 0 ? (
            <Empty>{t("costs.empty")}</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("common.description")}</th>
                  <th>{t("common.equipment")}</th>
                  <th>{t("common.category")}</th>
                  <th className="text-right">{t("common.amount")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap">{t.date(c.date)}</td>
                    <td>{c.description ?? "—"}</td>
                    <td>{c.asset ? <Link className="hover:underline" href={`/properties/${property.id}/assets/${c.asset.id}`}>{c.asset.name}</Link> : "—"}</td>
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
        </section>

        <aside className="space-y-4">
          {topAssets.length > 0 && (
            <div className="card">
              <h2 className="h2 mb-3">{t("costs.highestUpkeep")}</h2>
              <ul className="space-y-2 text-sm">
                {topAssets.map(([assetId, a]) => (
                  <li key={assetId} className="flex justify-between gap-2">
                    <span>{a.name}</span>
                    <span className="tabular-nums text-muted">{t.money(a.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form action={addCost} className="card space-y-3">
            <h2 className="h2">{t("costs.addTitle")}</h2>
            <Hidden name="propertyId" value={property.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("common.date")} name="date"><Input name="date" type="date" defaultValue={toDateInput(new Date())} /></Field>
              <Field label={t("common.amountUsd")} name="amount"><Input name="amount" type="number" step="0.01" min={0} required /></Field>
            </div>
            <Field label={t("common.category")} name="category"><Select name="category" options={COST_CATEGORIES} defaultValue="repair" /></Field>
            <Field label={t("common.equipment")} name="assetId">
              <Select
                name="assetId"
                emptyLabel={t("common.wholePropertyOption")}
                options={assets.map((a) => ({ value: a.id, label: a.name }))}
                otherPlaceholder={t("common.newEquipmentName")}
              />
            </Field>
            <Field label={t("common.description")} name="description"><Input name="description" /></Field>
            <button className="btn w-full">{t("costs.addButton")}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
