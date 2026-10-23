import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local-disk object storage for development. Swap for S3/GCS behind the same
// three functions in production (proposal §14: secure object storage).

const root = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");

function resolveKey(key: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function saveFile(propertyId: string, filename: string, data: Buffer) {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
  const key = `${propertyId}/${randomUUID()}${ext}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export function readStoredFile(key: string) {
  return readFile(resolveKey(key));
}

export async function deleteStoredFile(key: string) {
  await unlink(resolveKey(key)).catch(() => {});
}
