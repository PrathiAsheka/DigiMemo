import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";

// Uploaded files. With BLOB_READ_WRITE_TOKEN set (Vercel) they go to a private Vercel Blob
// store; otherwise to a local folder (UPLOAD_DIR) for development. Keys look the same in
// both: "<propertyId>/<uuid>.<ext>". Files are only ever served through /api/documents/[id],
// which checks ownership first. No "server-only" import so prisma/seed.ts can use it too.

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const root = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");

function resolveKey(key: string) {
  const full = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

export async function saveFile(propertyId: string, filename: string, data: Buffer, contentType?: string) {
  const ext = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
  const key = `${propertyId}/${randomUUID()}${ext}`;
  if (blobEnabled()) {
    await put(key, data, { access: "private", addRandomSuffix: false, contentType });
    return key;
  }
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export async function readStoredFile(key: string) {
  if (blobEnabled()) {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) throw new Error("Stored file not found");
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return readFile(resolveKey(key));
}

export async function deleteStoredFile(key: string) {
  if (blobEnabled()) {
    await del(key).catch(() => {});
    return;
  }
  await unlink(resolveKey(key)).catch(() => {});
}
