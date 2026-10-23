"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOwnsProperty, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/documents";
import { required, str } from "@/lib/forms";
import { deleteStoredFile, saveFile } from "@/lib/storage";
import { aiConfigured } from "@/lib/ai/client";

export type PhotoState = { error?: string; added?: number } | undefined;

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Adds one or more product photos to an equipment item (stored as "photo" documents).
 * With "read label" ticked and a single photo, it goes to AI extraction so the model,
 * serial number and dates can be filled in from a rating plate.
 */
export async function uploadAssetPhotos(_prev: PhotoState, form: FormData): Promise<PhotoState> {
  const user = await requireUser();
  const propertyId = required(form, "propertyId");
  await assertOwnsProperty(user.id, propertyId);
  const asset = await db.asset.findFirst({ where: { id: required(form, "assetId"), propertyId } });
  if (!asset) return { error: "Equipment not found" };

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose or take a photo first" };
  if (files.length > 10) return { error: "Add up to 10 photos at a time" };
  for (const f of files) {
    if (!PHOTO_TYPES.has(f.type)) return { error: `${f.name} isn't a JPEG, PNG, WebP or GIF image` };
    if (f.size > MAX_UPLOAD_BYTES) return { error: `${f.name} is larger than 15 MB` };
  }

  const caption = str(form, "caption")?.slice(0, 80) ?? null;
  const readLabel = form.get("readLabel") === "on" && files.length === 1 && aiConfigured();
  let lastId = "";
  for (const f of files) {
    const doc = await db.document.create({
      data: {
        propertyId,
        assetId: asset.id,
        filename: f.name.slice(0, 200),
        mimeType: f.type,
        sizeBytes: f.size,
        storageKey: await saveFile(propertyId, f.name, Buffer.from(await f.arrayBuffer())),
        kind: "photo",
        caption,
        extractionStatus: readLabel ? "pending" : "none",
      },
    });
    lastId = doc.id;
  }

  revalidatePath(`/properties/${propertyId}`, "layout");
  if (readLabel) redirect(`/properties/${propertyId}/documents/${lastId}`);
  return { added: files.length };
}

export async function deleteAssetPhoto(form: FormData) {
  const user = await requireUser();
  const doc = await db.document.findFirst({
    where: { id: required(form, "documentId"), kind: "photo", property: { ownerId: user.id } },
  });
  if (!doc) throw new Error("Photo not found");
  await db.document.delete({ where: { id: doc.id } });
  await deleteStoredFile(doc.storageKey);
  revalidatePath(`/properties/${doc.propertyId}`, "layout");
}
