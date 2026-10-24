import type { Property } from "@prisma/client";
import { Field, Input, Select, TextArea } from "@/components/ui";
import { PROPERTY_TYPES } from "@/lib/constants";
import { getT } from "@/i18n/server";

export async function PropertyFields({
  property,
  defaultType = "house",
  namePlaceholder,
}: {
  property?: Property;
  defaultType?: string;
  namePlaceholder?: string;
}) {
  const t = await getT();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("common.name")} name="name" className="sm:col-span-2">
        <Input name="name" required placeholder={namePlaceholder} defaultValue={property?.name} />
      </Field>
      <Field label={t("common.type")} name="type">
        <Select name="type" options={PROPERTY_TYPES} defaultValue={property?.type ?? defaultType} />
      </Field>
      <Field label={t("propertyFields.yearBuilt")} name="yearBuilt">
        <Input name="yearBuilt" type="number" min={1800} max={2100} defaultValue={property?.yearBuilt ?? ""} />
      </Field>
      <Field label={t("propertyFields.address")} name="address" className="sm:col-span-2">
        <Input name="address" defaultValue={property?.address ?? ""} />
      </Field>
      <Field label={t("common.notes")} name="notes" className="sm:col-span-2">
        <TextArea name="notes" defaultValue={property?.notes ?? ""} />
      </Field>
    </div>
  );
}
