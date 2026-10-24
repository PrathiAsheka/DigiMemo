import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile, illustrationForPropertyType } from "@/lib/profiles";
import { Empty, PageHeader } from "@/components/ui";
import { PlacePhoto } from "@/components/photos";
import { getT } from "@/i18n/server";

export default async function PropertiesPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const profile = getProfile(user.useCase, t.locale);
  const properties = await db.property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assets: true, spaces: true, documents: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={profile.pluralTitle} description={profile.propertiesDescription}>
        <Link href="/properties/new" className="btn">{t("properties.add", { noun: profile.noun })}</Link>
      </PageHeader>
      {properties.length === 0 ? (
        <div className="card">
          <Empty>{t("properties.empty", { nouns: profile.nounPlural })}</Empty>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="block overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent hover:shadow-md"
            >
              <PlacePhoto
                kind={illustrationForPropertyType(p.type, profile.illustration)}
                className="h-40 w-full"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
              <div className="p-4">
                <div className="font-medium">{p.name}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {t.label(p.type)}
                  {p.address ? ` · ${p.address}` : ""}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>{t("properties.spaces", { count: p._count.spaces })}</span>
                  <span>{t("properties.assets", { count: p._count.assets })}</span>
                  <span>{t("properties.documents", { count: p._count.documents })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
