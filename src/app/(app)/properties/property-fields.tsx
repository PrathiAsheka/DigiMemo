import type { Property } from "@prisma/client";
import { Field, Input, Select, TextArea } from "@/components/ui";
import { PROPERTY_TYPES } from "@/lib/constants";

export function PropertyFields({
  property,
  defaultType = "house",
  namePlaceholder = "e.g. Family home",
}: {
  property?: Property;
  defaultType?: string;
  namePlaceholder?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" name="name" className="sm:col-span-2">
        <Input name="name" required placeholder={namePlaceholder} defaultValue={property?.name} />
      </Field>
      <Field label="Type" name="type">
        <Select name="type" options={PROPERTY_TYPES} defaultValue={property?.type ?? defaultType} />
      </Field>
      <Field label="Year built" name="yearBuilt">
        <Input name="yearBuilt" type="number" min={1800} max={2100} defaultValue={property?.yearBuilt ?? ""} />
      </Field>
      <Field label="Address" name="address" className="sm:col-span-2">
        <Input name="address" defaultValue={property?.address ?? ""} />
      </Field>
      <Field label="Notes" name="notes" className="sm:col-span-2">
        <TextArea name="notes" defaultValue={property?.notes ?? ""} />
      </Field>
    </div>
  );
}
