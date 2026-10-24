import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/profiles";
import { tn } from "@/lib/space-templates";
import { PlacePhoto } from "@/components/photos";
import { getT } from "@/i18n/server";
import { createProperty } from "../actions";
import { PropertyFields } from "../property-fields";

export default async function NewPropertyPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  const profile = getProfile(user.useCase, t.locale);
  const isFirst = (await db.property.count({ where: { ownerId: user.id } })) === 0;
  const name = (x: { en: string; si: string }) => tn(x, t.locale);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <PlacePhoto kind={profile.illustration} className="h-52 w-full" sizes="672px" eager />
        <div className="p-5">
          <h1 className="h1">{isFirst ? t("newProperty.titleFirst", { noun: profile.noun }) : t("newProperty.titleAnother", { aNoun: profile.aNoun })}</h1>
          <p className="mt-1 text-sm text-muted">{t("newProperty.intro")}</p>
        </div>
      </div>
      <form action={createProperty} className="card space-y-5">
        <PropertyFields defaultType={profile.propertyType} namePlaceholder={profile.namePlaceholder} />
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">{t("newProperty.quickStart")}</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="seedSpaces" defaultChecked className="mt-0.5" />
            <span>
              {profile.id === "company" ? t("newProperty.addTypicalAreas") : t("newProperty.addTypicalRooms")}
              <span className="block text-xs text-muted">{profile.spaces.map(name).join(", ")}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="seedAssets" className="mt-0.5" />
            <span>
              {t("newProperty.alsoEquipment")}
              <span className="block text-xs text-muted">
                {t("newProperty.example", {
                  examples: profile.spaces
                    .slice(0, 2)
                    .map((s) => `${name(s)} → ${s.assets.slice(0, 3).map(name).join(" / ")}`)
                    .join(";  "),
                })}
              </span>
            </span>
          </label>
          <p className="text-xs text-muted">{t("newProperty.typeDecides")}</p>
        </fieldset>
        <button className="btn">{t("newProperty.create", { noun: profile.noun })}</button>
      </form>
    </div>
  );
}
