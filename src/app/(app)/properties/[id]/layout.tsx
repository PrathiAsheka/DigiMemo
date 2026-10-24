import Link from "next/link";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfDayUTC } from "@/lib/format";
import { getProfile, illustrationForPropertyType } from "@/lib/profiles";
import { PlacePhoto } from "@/components/photos";
import { getT } from "@/i18n/server";
import { PropertyTabs } from "./tabs";

export default async function PropertyLayout({ children, params }: LayoutProps<"/properties/[id]">) {
  const { id } = await params;
  const [{ user, property }, t] = await Promise.all([requireProperty(id), getT()]);
  const profile = getProfile(user.useCase, t.locale);

  const [overdue, openOrders, toReview] = await Promise.all([
    db.maintenanceTask.count({ where: { propertyId: property.id, active: true, nextDueDate: { lt: startOfDayUTC(new Date()) } } }),
    db.workOrder.count({ where: { propertyId: property.id, status: { notIn: ["completed", "cancelled"] } } }),
    db.document.count({ where: { propertyId: property.id, extractionStatus: "ready" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <PlacePhoto
          kind={illustrationForPropertyType(property.type, profile.illustration)}
          className="h-20 w-20 shrink-0 rounded-xl"
          sizes="80px"
          eager
        />
        <div>
          <Link href="/properties" className="text-xs text-muted hover:text-accent">← {t("property.allOf", { nouns: profile.nounPlural })}</Link>
          <h1 className="h1 mt-1">{property.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {t.label(property.type)}
            {property.address ? ` · ${property.address}` : ""}
            {property.yearBuilt ? ` · ${t("property.built", { year: property.yearBuilt })}` : ""}
          </p>
        </div>
      </div>
      <PropertyTabs propertyId={property.id} counts={{ maintenance: overdue, workOrders: openOrders, documents: toReview }} />
      {children}
    </div>
  );
}
