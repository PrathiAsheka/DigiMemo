"use client";

import { useActionState } from "react";
import { DOCUMENT_KINDS } from "@/lib/constants";
import { Select } from "@/components/select";
import { uploadDocument, type UploadState } from "../../document-actions";

export function UploadForm({
  propertyId,
  assets,
  presetAssetId,
  aiEnabled,
  aiHint,
}: {
  propertyId: string;
  assets: { id: string; name: string }[];
  presetAssetId?: string;
  aiEnabled: boolean;
  aiHint: string;
}) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadDocument, undefined);

  return (
    <form action={action} className="card space-y-3">
      <h2 className="h2">Upload a document</h2>
      <p className="text-xs text-muted">Receipts, invoices, warranty cards, manuals, service reports or a photo of an equipment label.</p>
      <input type="hidden" name="propertyId" value={propertyId} />
      <input
        type="file"
        name="file"
        required
        accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,text/plain"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
      />
      <div>
        <label className="field-label" htmlFor="kind">Type</label>
        <Select
          name="kind"
          options={DOCUMENT_KINDS}
          emptyLabel={aiEnabled ? "Let AI decide" : "— Not sure"}
          defaultValue=""
          otherPlaceholder="e.g. Inspection report"
        />
      </div>
      <div>
        <label className="field-label" htmlFor="assetId">Asset</label>
        <Select
          name="assetId"
          emptyLabel="— Not linked yet"
          options={assets.map((a) => ({ value: a.id, label: a.name }))}
          defaultValue={presetAssetId ?? ""}
          otherPlaceholder="New equipment name"
        />
      </div>
      {aiEnabled ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="analyse" defaultChecked />
          Read it with AI and suggest asset details
        </label>
      ) : (
        <p className="text-xs text-muted">{aiHint}</p>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Uploading…" : "Upload"}</button>
    </form>
  );
}
