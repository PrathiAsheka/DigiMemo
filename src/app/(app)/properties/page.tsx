import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { label } from "@/lib/constants";
import { capitalize, getProfile, illustrationForPropertyType } from "@/lib/profiles";
import { Empty, PageHeader } from "@/components/ui";
import { PlacePhoto } from "@/components/photos";

export default async function PropertiesPage() {
  const user = await requireUser();
  const profile = getProfile(user.useCase);
  const properties = await db.property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assets: true, spaces: true, documents: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={capitalize(profile.nounPlural)} description={profile.propertiesDescription}>
        <Link href="/properties/new" className="btn">Add {profile.noun}</Link>
      </PageHeader>
      {properties.length === 0 ? (
        <div className="card">
          <Empty>No {profile.nounPlural} yet. Add your first one to start building its digital twin.</Empty>
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
                  {label(p.type)}
                  {p.address ? ` · ${p.address}` : ""}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted">
                  <span>{p._count.spaces} spaces</span>
                  <span>{p._count.assets} assets</span>
                  <span>{p._count.documents} documents</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
