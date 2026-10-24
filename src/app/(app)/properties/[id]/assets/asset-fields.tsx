import type { Asset, Space } from "@prisma/client";
import { Field, Input, Select, TextArea } from "@/components/ui";
import { ASSET_CATEGORIES, ASSET_STATUSES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { getT } from "@/i18n/server";

export async function AssetFields({
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
  const t = await getT();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("common.name")} name="name" className="sm:col-span-2">
        <Input
          name="name"
          required
          placeholder={t("assets.namePlaceholder", { example: suggestions[0] ?? t("assets.nameExample") })}
          defaultValue={asset?.name}
          list={suggestions.length ? "asset-suggestions" : undefined}
        />
        {suggestions.length > 0 && (
          <datalist id="asset-suggestions">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </Field>
      <Field label={t("common.category")} name="category">
        <Select name="category" options={ASSET_CATEGORIES} defaultValue={asset?.category ?? "appliance"} />
      </Field>
      <Field label={t("assets.space")} name="spaceId">
        <Select
          name="spaceId"
          emptyLabel={t("common.notAssignedOption")}
          options={spaces.map((s) => ({ value: s.id, label: s.name }))}
          defaultValue={asset?.spaceId}
          otherPlaceholder={t("common.newRoomName")}
        />
      </Field>
      <Field label={t("assets.manufacturer")} name="manufacturer">
        <Input name="manufacturer" defaultValue={asset?.manufacturer ?? ""} />
      </Field>
      <Field label={t("assets.model")} name="model">
        <Input name="model" defaultValue={asset?.model ?? ""} />
      </Field>
      <Field label={t("assets.serialNumber")} name="serialNumber">
        <Input name="serialNumber" defaultValue={asset?.serialNumber ?? ""} />
      </Field>
      <Field label={t("common.status")} name="status">
        <Select name="status" options={ASSET_STATUSES} defaultValue={asset?.status ?? "active"} />
      </Field>
      <Field label={t("assets.purchaseDate")} name="purchaseDate">
        <Input name="purchaseDate" type="date" defaultValue={toDateInput(asset?.purchaseDate)} />
      </Field>
      <Field label={t("assets.installDate")} name="installDate">
        <Input name="installDate" type="date" defaultValue={toDateInput(asset?.installDate)} />
      </Field>
      <Field label={t("assets.purchasePrice")} name="purchasePrice">
        <Input name="purchasePrice" type="number" step="0.01" min={0} defaultValue={asset?.purchasePrice ?? ""} />
      </Field>
      <Field label={t("assets.expectedLife")} name="expectedLifeYears">
        <Input name="expectedLifeYears" type="number" min={1} max={100} defaultValue={asset?.expectedLifeYears ?? ""} />
      </Field>
      {withWarranty && (
        <Field label={t("assets.warrantyEnds")} name="warrantyEnd">
          <Input name="warrantyEnd" type="date" />
        </Field>
      )}
      <Field label={t("common.notes")} name="notes" className="sm:col-span-2">
        <TextArea name="notes" defaultValue={asset?.notes ?? ""} />
      </Field>
    </div>
  );
}
