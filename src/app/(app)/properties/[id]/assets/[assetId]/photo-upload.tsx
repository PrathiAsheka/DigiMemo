"use client";

import { useActionState, useRef } from "react";
import { uploadAssetPhotos, type PhotoState } from "../../../photo-actions";

const CAPTIONS = ["Front view", "Model / serial label", "Installed position", "Receipt", "Damage", "Spare part"];

export function PhotoUpload({ propertyId, assetId, aiEnabled }: { propertyId: string; assetId: string; aiEnabled: boolean }) {
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
        <label htmlFor="photos" className="field-label">Add photos</label>
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
        <label htmlFor="caption" className="field-label">What does it show? (optional)</label>
        <input id="caption" name="caption" list="photo-captions" maxLength={80} className="input" placeholder="e.g. Model / serial label" />
        <datalist id="photo-captions">
          {CAPTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      {aiEnabled && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="readLabel" className="mt-0.5" />
          <span>
            Read the label with AI
            <span className="block text-xs text-muted">For a single photo of the rating plate: fills in model, serial and dates for you to check.</span>
          </span>
        </label>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.added && <p className="text-sm text-ok">Added {state.added} photo{state.added === 1 ? "" : "s"}.</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Uploading…" : "Save photos"}</button>
    </form>
  );
}
