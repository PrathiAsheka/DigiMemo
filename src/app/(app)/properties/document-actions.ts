"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOwnsProperty, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ASSET_CATEGORIES, DOCUMENT_KINDS } from "@/lib/constants";
import { ACCEPTED_TYPES, findOwnedDocument, MAX_UPLOAD_BYTES } from "@/lib/documents";
import { date, float, int, oneOf, required, str } from "@/lib/forms";
import { addDays, startOfDayUTC } from "@/lib/format";
import { deleteStoredFile, saveFile } from "@/lib/storage";
import { canExtract } from "@/lib/ai/extract";
import { aiConfigured } from "@/lib/ai/client";

export type UploadState = { error?: string } | undefined;

export async function uploadDocument(_prev: UploadState, form: FormData): Promise<UploadState> {
  const user = await requireUser();
  const propertyId = required(form, "propertyId");
  await assertOwnsProperty(user.id, propertyId);

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Files must be 15 MB or smaller" };
  if (!ACCEPTED_TYPES.includes(file.type)) return { error: "Upload a PDF, image (JPEG, PNG, WebP, GIF) or text file" };

  const assetId = str(form, "assetId");
  if (assetId && !(await db.asset.count({ where: { id: assetId, propertyId } }))) return { error: "Unknown asset" };

  const analyse = form.get("analyse") === "on" && canExtract(file.type) && aiConfigured();
  const storageKey = await saveFile(propertyId, file.name, Buffer.from(await file.arrayBuffer()));
  const doc = await db.document.create({
    data: {
      propertyId,
      assetId,
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      kind: oneOf(form, "kind", DOCUMENT_KINDS, "other"),
      extractionStatus: analyse ? "pending" : "none",
    },
  });
  revalidatePath(`/properties/${propertyId}/documents`);
  redirect(`/properties/${propertyId}/documents/${doc.id}`);
}

export async function deleteDocument(form: FormData) {
  const user = await requireUser();
  const doc = await findOwnedDocument(user.id, required(form, "documentId"));
  if (!doc) throw new Error("Document not found");
  await db.document.delete({ where: { id: doc.id } });
  await deleteStoredFile(doc.storageKey);
  redirect(`/properties/${doc.propertyId}/documents`);
}

export async function linkDocument(form: FormData) {
  const user = await requireUser();
  const doc = await findOwnedDocument(user.id, required(form, "documentId"));
  if (!doc) throw new Error("Document not found");
  const assetId = str(form, "assetId");
  if (assetId && !(await db.asset.count({ where: { id: assetId, propertyId: doc.propertyId } }))) {
    throw new Error("Unknown asset");
  }
  await db.document.update({
    where: { id: doc.id },
    data: { assetId, kind: oneOf(form, "kind", DOCUMENT_KINDS, doc.kind as (typeof DOCUMENT_KINDS)[number]) },
  });
  revalidatePath(`/properties/${doc.propertyId}`, "layout");
}

/**
 * Applies the user-reviewed extraction: creates or updates the asset, then optionally
 * adds a warranty, purchase cost, service record and maintenance schedule (proposal §7).
 */
export async function confirmExtraction(form: FormData) {
  const user = await requireUser();
  const doc = await findOwnedDocument(user.id, required(form, "documentId"));
  if (!doc) throw new Error("Document not found");
  const propertyId = doc.propertyId;

  const target = required(form, "target");
  const spaceId = str(form, "spaceId");
  const validSpace = spaceId && (await db.space.count({ where: { id: spaceId, propertyId } })) ? spaceId : null;
  const purchaseDate = date(form, "purchaseDate");
  const purchasePrice = float(form, "purchasePrice");

  const fields = {
    name: str(form, "name"),
    manufacturer: str(form, "manufacturer"),
    model: str(form, "model"),
    serialNumber: str(form, "serialNumber"),
    purchaseDate,
    purchasePrice,
  };

  const assetId = await db.$transaction(async (tx) => {
    let assetId: string;
    if (target === "new") {
      const asset = await tx.asset.create({
        data: {
          ...fields,
          name: fields.name ?? doc.filename,
          propertyId,
          spaceId: validSpace,
          category: oneOf(form, "category", ASSET_CATEGORIES, "other"),
        },
      });
      assetId = asset.id;
    } else {
      const existing = await tx.asset.findFirst({ where: { id: target, propertyId } });
      if (!existing) throw new Error("Asset not found");
      // Only fill values the user kept; never blank out existing data.
      const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
      await tx.asset.update({ where: { id: existing.id }, data: { ...updates, ...(validSpace ? { spaceId: validSpace } : {}) } });
      assetId = existing.id;
    }

    if (form.get("createWarranty") === "on") {
      const endDate = date(form, "warrantyEnd");
      if (endDate) {
        await tx.warranty.create({
          data: {
            assetId,
            documentId: doc.id,
            provider: str(form, "warrantyProvider"),
            startDate: purchaseDate,
            endDate,
            terms: str(form, "warrantyTerms"),
          },
        });
      }
    }

    if (form.get("createPurchaseCost") === "on" && purchasePrice != null) {
      await tx.costRecord.create({
        data: {
          propertyId,
          assetId,
          amount: purchasePrice,
          currency: str(form, "currency") ?? "USD",
          date: purchaseDate ?? doc.createdAt,
          category: "purchase",
          description: `Purchase${str(form, "vendor") ? ` from ${str(form, "vendor")}` : ""}`,
        },
      });
    }

    if (form.get("createService") === "on") {
      const serviceDate = date(form, "serviceDate") ?? doc.createdAt;
      const title = str(form, "serviceDescription") ?? "Service visit";
      const wo = await tx.workOrder.create({
        data: { propertyId, assetId, title, status: "completed", completedAt: serviceDate, resolution: `From ${doc.filename}` },
      });
      await tx.document.update({ where: { id: doc.id }, data: { workOrderId: wo.id } });
      const cost = float(form, "serviceCost");
      if (cost != null && cost > 0) {
        await tx.costRecord.create({
          data: { propertyId, assetId, workOrderId: wo.id, amount: cost, date: serviceDate, category: "service", description: title },
        });
      }
    }

    const taskCount = int(form, "taskCount") ?? 0;
    for (let i = 0; i < Math.min(taskCount, 20); i++) {
      if (form.get(`task_${i}`) !== "on") continue;
      const title = str(form, `task_title_${i}`);
      if (!title) continue;
      const interval = int(form, `task_interval_${i}`);
      await tx.maintenanceTask.create({
        data: {
          propertyId,
          assetId,
          title,
          intervalDays: interval && interval > 0 ? interval : null,
          nextDueDate: date(form, `task_due_${i}`) ?? addDays(startOfDayUTC(new Date()), 7),
        },
      });
    }

    await tx.document.update({ where: { id: doc.id }, data: { assetId, extractionStatus: "confirmed" } });
    return assetId;
  });

  revalidatePath(`/properties/${propertyId}`, "layout");
  revalidatePath("/dashboard");
  redirect(`/properties/${propertyId}/assets/${assetId}`);
}
