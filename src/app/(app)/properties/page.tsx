import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { label } from "@/lib/constants";
import { Empty } from "@/components/ui";

export default async function PropertiesPage() {
  const user = await requireUser();
  const properties = await db.property.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assets: true, spaces: true, documents: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Properties</h1>
        <Link href="/properties/new" className="btn">Add property</Link>
      </div>
      {properties.length === 0 ? (
        <div className="card">
          <Empty>No properties yet. Add your first one to start building its digital twin.</Empty>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="card block hover:border-accent">
              <div className="font-medium">{p.name}</div>
              <div className="mt-0.5 text-sm text-muted">
                {label(p.type)}
                {p.address ? ` · ${p.address}` : ""}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-muted">
                <span>{p._count.spaces} spaces</span>
                <span>{p._count.assets} assets</span>
                <span>{p._count.documents} documents</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
