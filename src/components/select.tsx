"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { OTHER } from "@/lib/other";

type Option = { value: string; label: string };

/**
 * Dropdown with a built-in "Other…" choice. Picking it shows a text box right below,
 * submitted as `<name>__other`; the server reads it with the helpers in lib/forms.ts.
 * A saved custom value (one not in `options`) re-opens as "Other…" with the text filled in.
 */
export function Select({
  name,
  id,
  options,
  defaultValue,
  emptyLabel,
  other = true,
  otherLabel,
  otherPlaceholder,
  otherType = "text",
}: {
  name: string;
  id?: string;
  options: readonly string[] | Option[];
  defaultValue?: string | null;
  emptyLabel?: string;
  /** Set false for pickers where a free-text answer makes no sense. */
  other?: boolean;
  otherLabel?: string;
  otherPlaceholder?: string;
  otherType?: "text" | "number";
}) {
  const t = useT();
  otherLabel ??= t("common.other");
  otherPlaceholder ??= t("common.typeHere");
  let opts: Option[] = options.map((o) => (typeof o === "string" ? { value: o, label: t.label(o) } : o));
  // The built-in "Other…" replaces any list entry literally called "other".
  if (other) opts = opts.filter((o) => o.value !== "other");

  const initial = defaultValue ?? "";
  const isCustom = other && initial !== "" && initial !== "other" && !opts.some((o) => o.value === initial);
  const [value, setValue] = useState(isCustom || (other && initial === "other") ? OTHER : initial);
  const selectId = id ?? name;

  return (
    <div className="space-y-2">
      <select id={selectId} name={name} className="input" value={value} onChange={(e) => setValue(e.target.value)}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {other && <option value={OTHER}>{otherLabel}</option>}
      </select>
      {other && value === OTHER && (
        <input
          name={`${name}__other`}
          type={otherType}
          min={otherType === "number" ? 1 : undefined}
          className="input"
          placeholder={otherPlaceholder}
          defaultValue={isCustom ? initial : ""}
          aria-label={t("common.otherTypeOwn")}
          autoFocus={!isCustom}
          maxLength={otherType === "text" ? 60 : undefined}
        />
      )}
    </div>
  );
}
