import { requireProperty } from "@/lib/auth";
import { label } from "@/lib/constants";
import { PropertyTabs } from "./tabs";

export default async function PropertyLayout({ children, params }: LayoutProps<"/properties/[id]">) {
  const { id } = await params;
  const { property } = await requireProperty(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">{property.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {label(property.type)}
          {property.address ? ` · ${property.address}` : ""}
          {property.yearBuilt ? ` · built ${property.yearBuilt}` : ""}
        </p>
      </div>
      <PropertyTabs propertyId={property.id} />
      {children}
    </div>
  );
}
