import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfigured } from "@/lib/ai/client";
import { Badge, Empty } from "@/components/ui";
import { getT } from "@/i18n/server";
import { UploadForm } from "./upload-form";

const EXTRACTION_BADGE = {
  pending: { key: "documents.badgePending", tone: "muted" },
  ready: { key: "documents.badgeReady", tone: "warn" },
  confirmed: { key: "documents.badgeConfirmed", tone: "ok" },
  failed: { key: "documents.badgeFailed", tone: "danger" },
} as const;

export default async function DocumentsPage({ params, searchParams }: PageProps<"/properties/[id]/documents">) {
  const { id } = await params;
  const { asset } = await searchParams;
  const [{ property }, t] = await Promise.all([requireProperty(id), getT()]);

  const [documents, assets] = await Promise.all([
    db.document.findMany({
      where: { propertyId: property.id },
      orderBy: { createdAt: "desc" },
      include: { asset: { select: { id: true, name: true } } },
    }),
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card">
        {documents.length === 0 ? (
          <Empty>{t("documents.empty")}</Empty>
        ) : (
          <table className="table">
            <thead><tr><th>{t("documents.file")}</th><th>{t("common.type")}</th><th>{t("common.equipment")}</th><th>{t("documents.added")}</th><th /></tr></thead>
            <tbody>
              {documents.map((d) => {
                const badge = EXTRACTION_BADGE[d.extractionStatus as keyof typeof EXTRACTION_BADGE];
                return (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/properties/${property.id}/documents/${d.id}`} className="font-medium hover:underline">{d.filename}</Link>
                    </td>
                    <td>{t.label(d.kind)}</td>
                    <td>{d.asset ? <Link className="hover:underline" href={`/properties/${property.id}/assets/${d.asset.id}`}>{d.asset.name}</Link> : "—"}</td>
                    <td className="whitespace-nowrap">{t.date(d.createdAt)}</td>
                    <td className="text-right">{badge && <Badge tone={badge.tone}>{t(badge.key)}</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <aside>
        <UploadForm
          propertyId={property.id}
          assets={assets}
          presetAssetId={typeof asset === "string" ? asset : undefined}
          aiEnabled={aiConfigured()}
        />
      </aside>
    </div>
  );
}
