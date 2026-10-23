import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { findOwnedDocument } from "@/lib/documents";
import { readStoredFile } from "@/lib/storage";
import { canExtract, extractDocument } from "@/lib/ai/extract";
import { describeAiError } from "@/lib/ai/client";

export const maxDuration = 300;

// Runs AI extraction for one document and stores the proposal for user review.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]/extract">) {
  const userId = await getSessionUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const doc = await findOwnedDocument(userId, id);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canExtract(doc.mimeType)) {
    return Response.json({ error: "Only PDFs and images can be analysed" }, { status: 400 });
  }

  await db.document.update({ where: { id: doc.id }, data: { extractionStatus: "pending", extractionError: null } });
  try {
    const extraction = await extractDocument(
      await readStoredFile(doc.storageKey),
      doc.mimeType,
      doc.filename,
      new Date().toISOString().slice(0, 10),
    );
    await db.document.update({
      where: { id: doc.id },
      data: {
        extractionStatus: "ready",
        extraction: JSON.stringify(extraction),
        // Fill in the kind if the user left it as "other".
        kind: doc.kind === "other" ? extraction.documentKind : doc.kind,
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && !("status" in error) ? error.message : describeAiError(error);
    await db.document.update({ where: { id: doc.id }, data: { extractionStatus: "failed", extractionError: message } });
    return Response.json({ error: message }, { status: 502 });
  }
}
