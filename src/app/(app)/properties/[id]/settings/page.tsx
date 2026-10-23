import { requireProperty } from "@/lib/auth";
import { Hidden } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteProperty, updateProperty } from "../../actions";
import { PropertyFields } from "../../property-fields";

export default async function PropertySettingsPage({ params }: PageProps<"/properties/[id]/settings">) {
  const { id } = await params;
  const { property } = await requireProperty(id);

  return (
    <div className="max-w-2xl space-y-6">
      <form action={updateProperty} className="card space-y-5">
        <h2 className="h2">Property details</h2>
        <Hidden name="propertyId" value={property.id} />
        <PropertyFields property={property} />
        <button className="btn">Save changes</button>
      </form>
      <form action={deleteProperty} className="card space-y-3 border-danger/40">
        <h2 className="h2 text-danger">Delete property</h2>
        <p className="text-sm text-muted">
          Permanently removes this property with all its spaces, assets, documents, maintenance and cost history.
        </p>
        <Hidden name="propertyId" value={property.id} />
        <ConfirmButton message={`Permanently delete ${property.name} and all of its records? This cannot be undone.`}>
          Delete this property
        </ConfirmButton>
      </form>
    </div>
  );
}
