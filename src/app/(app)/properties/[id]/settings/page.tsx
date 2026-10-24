import { requireProperty } from "@/lib/auth";
import { Hidden } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { getT } from "@/i18n/server";
import { deleteProperty, updateProperty } from "../../actions";
import { PropertyFields } from "../../property-fields";

export default async function PropertySettingsPage({ params }: PageProps<"/properties/[id]/settings">) {
  const { id } = await params;
  const [{ property }, t] = await Promise.all([requireProperty(id), getT()]);

  return (
    <div className="max-w-2xl space-y-6">
      <form action={updateProperty} className="card space-y-5">
        <h2 className="h2">{t("settings.details")}</h2>
        <Hidden name="propertyId" value={property.id} />
        <PropertyFields property={property} />
        <button className="btn">{t("common.saveChanges")}</button>
      </form>
      <form action={deleteProperty} className="card space-y-3 border-danger/40">
        <h2 className="h2 text-danger">{t("settings.deleteTitle")}</h2>
        <p className="text-sm text-muted">{t("settings.deleteText")}</p>
        <Hidden name="propertyId" value={property.id} />
        <ConfirmButton message={t("settings.deleteConfirm", { name: property.name })}>
          {t("settings.deleteButton")}
        </ConfirmButton>
      </form>
    </div>
  );
}
