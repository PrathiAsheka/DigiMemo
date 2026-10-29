import "server-only";
import { db } from "./db";
import { otherText, str } from "./forms";
import { OTHER } from "./other";

// Dropdowns that pick a room, piece of equipment or provider also offer "Other…".
// These resolve the submitted value to an id the user owns, creating the record from
// the typed name when "Other…" was chosen. Ids from the form are never trusted as-is.

export async function resolveSpaceId(form: FormData, key: string, propertyId: string) {
  const v = str(form, key);
  if (!v) return null;
  if (v === OTHER) {
    const name = otherText(form, key);
    if (!name) return null;
    const existing = await db.space.findFirst({ where: { propertyId, name } });
    return (existing ?? (await db.space.create({ data: { propertyId, name, kind: "room" } }))).id;
  }
  return (await db.space.count({ where: { id: v, propertyId } })) ? v : null;
}

export async function resolveAssetId(form: FormData, key: string, propertyId: string) {
  const v = str(form, key);
  if (!v) return null;
  if (v === OTHER) {
    const name = otherText(form, key);
    if (!name) return null;
    const existing = await db.asset.findFirst({ where: { propertyId, name } });
    return (existing ?? (await db.asset.create({ data: { propertyId, name, category: "other" } }))).id;
  }
  return (await db.asset.count({ where: { id: v, propertyId } })) ? v : null;
}

export async function resolveMemberId(form: FormData, key: string, propertyId: string) {
  const v = str(form, key);
  if (!v) return null;
  if (v === OTHER) {
    const name = otherText(form, key);
    if (!name) return null;
    const existing = await db.member.findFirst({ where: { propertyId, name } });
    return (existing ?? (await db.member.create({ data: { propertyId, name } }))).id;
  }
  return (await db.member.count({ where: { id: v, propertyId } })) ? v : null;
}

export async function resolveProviderId(form: FormData, key: string, ownerId: string) {
  const v = str(form, key);
  if (!v) return null;
  if (v === OTHER) {
    const name = otherText(form, key);
    if (!name) return null;
    const existing = await db.serviceProvider.findFirst({ where: { ownerId, name } });
    return (existing ?? (await db.serviceProvider.create({ data: { ownerId, name } }))).id;
  }
  return (await db.serviceProvider.count({ where: { id: v, ownerId } })) ? v : null;
}
