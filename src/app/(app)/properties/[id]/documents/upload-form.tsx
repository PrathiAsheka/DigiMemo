"use client";

import { useActionState } from "react";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { Select } from "@/components/select";
import { useT } from "@/i18n/client";
import { uploadDocument, type UploadState } from "../../document-actions";

export function UploadForm({
  propertyId,
  assets,
  members,
  presetAssetId,
  presetMemberId,
  aiEnabled,
}: {
  propertyId: string;
  assets: { id: string; name: string }[];
  members: { id: string; name: string; role: string | null }[];
  presetAssetId?: string;
  presetMemberId?: string;
  aiEnabled: boolean;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadDocument, undefined);

  return (
    <form action={action} className="card space-y-3">
      <h2 className="h2">{t("documents.uploadTitle")}</h2>
      <p className="text-xs text-muted">{t("documents.uploadHint")}</p>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input
        type="file"
        name="file"
        required
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,text/plain"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
      />
      <div>
        <label className="field-label" htmlFor="kind">{t("common.type")}</label>
        <Select
          name="kind"
          options={DOCUMENT_KINDS}
          emptyLabel={aiEnabled ? t("documents.letAiDecide") : t("documents.notSure")}
          defaultValue=""
          otherPlaceholder={t("documents.kindPlaceholder")}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="memberId">{t("documents.member")}</label>
        <Select
          name="memberId"
          emptyLabel={t("documents.notForPerson")}
          options={members.map((m) => ({ value: m.id, label: m.role ? `${m.name} (${t.label(m.role)})` : m.name }))}
          defaultValue={presetMemberId ?? ""}
          otherPlaceholder={t("members.newName")}
        />
        <p className="mt-1 text-xs text-muted">{t("documents.memberHint")}</p>
      </div>
      <div>
        <label className="field-label" htmlFor="assetId">{t("common.equipment")}</label>
        <Select
          name="assetId"
          emptyLabel={t("documents.notLinked")}
          options={assets.map((a) => ({ value: a.id, label: a.name }))}
          defaultValue={presetAssetId ?? ""}
          otherPlaceholder={t("common.newEquipmentName")}
        />
      </div>
      {aiEnabled && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="analyse" defaultChecked />
          {t("documents.analyse")}
        </label>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? t("photos.uploading") : t("assets.upload")}</button>
    </form>
  );
}
