"use client";

import { useActionState, useRef } from "react";
import { useT } from "@/i18n/client";
import { uploadAssetPhotos, type PhotoState } from "../../../photo-actions";

const CAPTIONS = ["captionFront", "captionLabel", "captionInstalled", "captionReceipt", "captionDamage", "captionSpare"] as const;

export function PhotoUpload({ propertyId, assetId, aiEnabled }: { propertyId: string; assetId: string; aiEnabled: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<PhotoState, FormData>(async (prev, form) => {
    const result = await uploadAssetPhotos(prev, form);
    if (result?.added) formRef.current?.reset();
    return result;
  }, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-lg border border-dashed border-accent/50 bg-surface-2/40 p-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="assetId" value={assetId} />
      <div>
        <label htmlFor="photos" className="field-label">{t("photos.add")}</label>
        {/* capture opens the camera on phones; desktops get the normal file picker */}
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          multiple
          required
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-fg"
        />
      </div>
      <div>
        <label htmlFor="caption" className="field-label">{t("photos.captionLabelField")}</label>
        <input id="caption" name="caption" list="photo-captions" maxLength={80} className="input" placeholder={t("photos.captionPlaceholder")} />
        <datalist id="photo-captions">
          {CAPTIONS.map((c) => <option key={c} value={t(`photos.${c}`)} />)}
        </datalist>
      </div>
      {aiEnabled && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="readLabel" className="mt-0.5" />
          <span>
            {t("photos.readLabel")}
            <span className="block text-xs text-muted">{t("photos.readLabelHint")}</span>
          </span>
        </label>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.added && <p className="text-sm text-ok">{t("photos.added", { count: state.added })}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? t("photos.uploading") : t("photos.save")}</button>
    </form>
  );
}
