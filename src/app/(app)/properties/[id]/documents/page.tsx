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

const SHARED = "none"; // ?member=none: documents not about one person

export default async function DocumentsPage({ params, searchParams }: PageProps<"/properties/[id]/documents">) {
  const { id } = await params;
  const { asset, member } = await searchParams;
  const [{ property }, t] = await Promise.all([requireProperty(id), getT()]);

  const [documents, assets, members] = await Promise.all([
    db.document.findMany({
      where: { propertyId: property.id },
      orderBy: { createdAt: "desc" },
      include: { asset: { select: { id: true, name: true } } },
    }),
    db.asset.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.member.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, role: true } }),
  ]);

  const base = `/properties/${property.id}`;
  const filter = typeof member === "string" && (member === SHARED || members.some((m) => m.id === member)) ? member : null;

  // One group per member, then everything that belongs to the place as a whole.
  const groups = [
    ...members.map((m) => ({
      key: m.id,
      title: m.name,
      subtitle: m.role ? t.label(m.role) : null,
      docs: documents.filter((d) => d.memberId === m.id),
    })),
    { key: SHARED, title: t("documents.sharedTitle"), subtitle: t("documents.sharedHint"), docs: documents.filter((d) => !d.memberId) },
  ];
  const shown = groups.filter((g) => (filter ? g.key === filter : g.docs.length > 0));

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface hover:border-accent"}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {documents.length > 0 && members.length > 0 && (
          <nav className="flex flex-wrap gap-2" aria-label={t("documents.byMember")}>
            <Link href={`${base}/documents`} className={chip(!filter)}>{t("alerts.all")} ({documents.length})</Link>
            {groups.map((g) => (
              <Link key={g.key} href={`${base}/documents?member=${g.key}`} className={chip(filter === g.key)}>
                {g.title} ({g.docs.length})
              </Link>
            ))}
          </nav>
        )}

        {documents.length === 0 ? (
          <section className="card"><Empty>{t("documents.empty")}</Empty></section>
        ) : (
          shown.map((g) => (
            <section key={g.key} className="card overflow-x-auto">
              {members.length > 0 && (
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="h2">
                    {g.title} <span className="text-sm font-normal text-muted">({g.docs.length})</span>
                  </h2>
                  {g.subtitle && <span className="text-xs text-muted">{g.subtitle}</span>}
                </div>
              )}
              {g.docs.length === 0 ? (
                <Empty>{t("documents.groupEmpty")}</Empty>
              ) : (
                <table className="table">
                  <thead><tr><th>{t("documents.file")}</th><th>{t("common.type")}</th><th>{t("common.equipment")}</th><th>{t("documents.added")}</th><th /></tr></thead>
                  <tbody>
                    {g.docs.map((d) => {
                      const badge = EXTRACTION_BADGE[d.extractionStatus as keyof typeof EXTRACTION_BADGE];
                      return (
                        <tr key={d.id}>
                          <td>
                            <Link href={`${base}/documents/${d.id}`} className="font-medium hover:underline">{d.filename}</Link>
                          </td>
                          <td>{t.label(d.kind)}</td>
                          <td>{d.asset ? <Link className="hover:underline" href={`${base}/assets/${d.asset.id}`}>{d.asset.name}</Link> : "—"}</td>
                          <td className="whitespace-nowrap">{t.date(d.createdAt)}</td>
                          <td className="text-right">{badge && <Badge tone={badge.tone}>{t(badge.key)}</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          ))
        )}
      </div>
      <aside id="upload" className="scroll-mt-6">
        <UploadForm
          propertyId={property.id}
          assets={assets}
          members={members}
          presetAssetId={typeof asset === "string" ? asset : undefined}
          presetMemberId={filter && filter !== SHARED ? filter : undefined}
          aiEnabled={aiConfigured()}
        />
      </aside>
    </div>
  );
}
