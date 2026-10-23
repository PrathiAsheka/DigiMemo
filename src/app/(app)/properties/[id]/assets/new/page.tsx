import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile, profileForPropertyType } from "@/lib/profiles";
import { Hidden } from "@/components/ui";
import { createAsset } from "../../../actions";
import { AssetFields } from "../asset-fields";

export default async function NewAssetPage({ params }: PageProps<"/properties/[id]/assets/new">) {
  const { id } = await params;
  const { user, property } = await requireProperty(id);
  const profile = profileForPropertyType(property.type, getProfile(user.useCase));
  const spaces = await db.space.findMany({ where: { propertyId: property.id }, orderBy: { name: "asc" } });

  return (
    <form action={createAsset} className="card max-w-3xl space-y-5">
      <div>
        <h2 className="h2">Add equipment</h2>
        <p className="mt-1 text-sm text-muted">Common here: {profile.assetSuggestions.slice(0, 6).join(", ")}.</p>
      </div>
      <Hidden name="propertyId" value={property.id} />
      <AssetFields spaces={spaces} withWarranty suggestions={profile.assetSuggestions} />
      <button className="btn">Create asset</button>
    </form>
  );
}
