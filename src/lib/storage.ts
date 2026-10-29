import "server-only";

// See file-store.ts: Vercel Blob in production, a local folder in development.
export { deleteStoredFile, readStoredFile, saveFile } from "./file-store";
