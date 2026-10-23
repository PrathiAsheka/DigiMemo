import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { label } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { aiConfigured } from "@/lib/ai/client";
import { Badge, Empty } from "@/components/ui";
import { UploadForm } from "./upload-form";

const EXTRACTION_BADGE: Record<string, { text: string; tone: "ok" | "warn" | "danger" | "muted" }> = {
  pending: { text: "Analysing", tone: "muted" },
  ready: { text: "Review AI suggestions", tone: "warn" },
  confirmed: { text: "Confirmed", tone: "ok" },
  failed: { text: "AI failed", tone: "danger" },
};

export default async function DocumentsPage({ params, searchParams }: PageProps<"/properties/[id]/documents">) {
  const { id } = await params;
  const { asset } = await searchParams;
  const { property } = await requireProperty(id);

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
          <Empty>No documents yet. Upload a receipt or warranty card and AI will draft the asset record for you to confirm.</Empty>
        ) : (
          <table className="table">
            <thead><tr><th>File</th><th>Type</th><th>Asset</th><th>Added</th><th /></tr></thead>
            <tbody>
              {documents.map((d) => {
                const badge = EXTRACTION_BADGE[d.extractionStatus];
                return (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/properties/${property.id}/documents/${d.id}`} className="font-medium hover:underline">{d.filename}</Link>
                    </td>
                    <td>{label(d.kind)}</td>
                    <td>{d.asset ? <Link className="hover:underline" href={`/properties/${property.id}/assets/${d.asset.id}`}>{d.asset.name}</Link> : "—"}</td>
                    <td className="whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="text-right">{badge && <Badge tone={badge.tone}>{badge.text}</Badge>}</td>
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
