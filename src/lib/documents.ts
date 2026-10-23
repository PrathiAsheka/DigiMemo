import "server-only";
import { db } from "./db";

/** Loads a document only if the given user owns its property. */
export function findOwnedDocument(userId: string, documentId: string) {
  return db.document.findFirst({ where: { id: documentId, property: { ownerId: userId } } });
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
];
