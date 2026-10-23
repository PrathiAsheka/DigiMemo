import type { Asset, Space } from "@prisma/client";
import { Field, Input, Select, TextArea } from "@/components/ui";
import { ASSET_CATEGORIES, ASSET_STATUSES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";

export function AssetFields({
  asset,
  spaces,
  withWarranty,
  suggestions = [],
}: {
  asset?: Asset;
  spaces: Space[];
  withWarranty?: boolean;
  suggestions?: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" name="name" className="sm:col-span-2">
        <Input
          name="name"
          required
          placeholder={suggestions[0] ? `e.g. ${suggestions[0]}` : "e.g. Kitchen refrigerator"}
          defaultValue={asset?.name}
          list={suggestions.length ? "asset-suggestions" : undefined}
        />
        {suggestions.length > 0 && (
          <datalist id="asset-suggestions">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </Field>
      <Field label="Category" name="category">
        <Select name="category" options={ASSET_CATEGORIES} defaultValue={asset?.category ?? "appliance"} />
      </Field>
      <Field label="Space" name="spaceId">
        <Select
          name="spaceId"
          emptyLabel="— Not assigned"
          options={spaces.map((s) => ({ value: s.id, label: s.name }))}
          defaultValue={asset?.spaceId}
        otherPlaceholder="New room name" />
      </Field>
      <Field label="Manufacturer" name="manufacturer">
        <Input name="manufacturer" defaultValue={asset?.manufacturer ?? ""} />
      </Field>
      <Field label="Model" name="model">
        <Input name="model" defaultValue={asset?.model ?? ""} />
      </Field>
      <Field label="Serial number" name="serialNumber">
        <Input name="serialNumber" defaultValue={asset?.serialNumber ?? ""} />
      </Field>
      <Field label="Status" name="status">
        <Select name="status" options={ASSET_STATUSES} defaultValue={asset?.status ?? "active"} />
      </Field>
      <Field label="Purchase date" name="purchaseDate">
        <Input name="purchaseDate" type="date" defaultValue={toDateInput(asset?.purchaseDate)} />
      </Field>
      <Field label="Install date" name="installDate">
        <Input name="installDate" type="date" defaultValue={toDateInput(asset?.installDate)} />
      </Field>
      <Field label="Purchase price (USD)" name="purchasePrice">
        <Input name="purchasePrice" type="number" step="0.01" min={0} defaultValue={asset?.purchasePrice ?? ""} />
      </Field>
      <Field label="Expected life (years)" name="expectedLifeYears">
        <Input name="expectedLifeYears" type="number" min={1} max={100} defaultValue={asset?.expectedLifeYears ?? ""} />
      </Field>
      {withWarranty && (
        <Field label="Warranty ends" name="warrantyEnd">
          <Input name="warrantyEnd" type="date" />
        </Field>
      )}
      <Field label="Notes" name="notes" className="sm:col-span-2">
        <TextArea name="notes" defaultValue={asset?.notes ?? ""} />
      </Field>
    </div>
  );
}
