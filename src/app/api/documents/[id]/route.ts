import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { findOwnedDocument } from "@/lib/documents";
import { readStoredFile } from "@/lib/storage";

// Serves an uploaded file to its owner only. Files never live under /public.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const doc = await findOwnedDocument(userId, id);
  if (!doc) return new Response("Not found", { status: 404 });

  const data = await readStoredFile(doc.storageKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
