import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { Hidden } from "@/components/ui";
import { createAsset } from "../../../actions";
import { AssetFields } from "../asset-fields";

export default async function NewAssetPage({ params }: PageProps<"/properties/[id]/assets/new">) {
  const { id } = await params;
  const { property } = await requireProperty(id);
  const spaces = await db.space.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } });

  return (
    <form action={createAsset} className="card max-w-3xl space-y-5">
      <h2 className="h2">Add an asset</h2>
      <Hidden name="propertyId" value={property.id} />
      <AssetFields spaces={spaces} withWarranty />
      <button className="btn">Create asset</button>
    </form>
  );
}
