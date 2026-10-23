import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/profiles";
import { PlacePhoto } from "@/components/photos";
import { createProperty } from "../actions";
import { PropertyFields } from "../property-fields";

export default async function NewPropertyPage() {
  const user = await requireUser();
  const profile = getProfile(user.useCase);
  const isFirst = (await db.property.count({ where: { ownerId: user.id } })) === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <PlacePhoto kind={profile.illustration} className="h-52 w-full" sizes="672px" eager />
        <div className="p-5">
          <h1 className="h1">{isFirst ? `Add your ${profile.noun}` : `Add another ${profile.noun}`}</h1>
          <p className="mt-1 text-sm text-muted">
            Start with the basics. You can add equipment, documents and maintenance next.
          </p>
        </div>
      </div>
      <form action={createProperty} className="card space-y-5">
        <PropertyFields defaultType={profile.propertyType} namePlaceholder={profile.namePlaceholder} />
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium">Quick start</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="seedSpaces" defaultChecked className="mt-0.5" />
            <span>
              Add typical {profile.id === "company" ? "areas" : "rooms"}
              <span className="block text-xs text-muted">{profile.spaces.map((s) => s.name).join(", ")}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="seedAssets" className="mt-0.5" />
            <span>
              Also add the equipment usually found in each one
              <span className="block text-xs text-muted">
                e.g. {profile.spaces.slice(0, 2).map((s) => `${s.name} → ${s.assets.slice(0, 3).map((x) => x.name).join(" / ")}`).join(";  ")}.
                Remove anything you don&apos;t have.
              </span>
            </span>
          </label>
          <p className="text-xs text-muted">The type you pick above decides which rooms and equipment are used.</p>
        </fieldset>
        <button className="btn">Create {profile.noun}</button>
      </form>
    </div>
  );
}
