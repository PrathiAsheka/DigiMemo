"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOwnsProperty, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  COST_CATEGORIES,
  PROPERTY_TYPES,
  SPACE_KINDS,
} from "@/lib/constants";
import { date, float, int, oneOf, required, str } from "@/lib/forms";
import { getProfile, profileForPropertyType } from "@/lib/profiles";
import { alreadyHas, templateForSpace, type SpaceTemplate } from "@/lib/space-templates";
import { deleteStoredFile } from "@/lib/storage";
import { resolveAssetId, resolveSpaceId } from "@/lib/form-entities";

// Every action re-reads the session and checks ownership; never trust ids from the form.

async function ownedProperty(form: FormData) {
  const user = await requireUser();
  const propertyId = required(form, "propertyId");
  await assertOwnsProperty(user.id, propertyId);
  return { user, propertyId };
}

async function ownedAsset(form: FormData) {
  const { user, propertyId } = await ownedProperty(form);
  const assetId = required(form, "assetId");
  const asset = await db.asset.findFirst({ where: { id: assetId, propertyId } });
  if (!asset) throw new Error("Asset not found");
  return { user, propertyId, asset };
}

// ── Properties ──────────────────────────────────────────────────────────────

export async function createProperty(form: FormData) {
  const user = await requireUser();
  const profile = getProfile(user.useCase);
  const type = oneOf(form, "type", PROPERTY_TYPES, profile.propertyType as (typeof PROPERTY_TYPES)[number]);
  const property = await db.property.create({
    data: {
      ownerId: user.id,
      name: required(form, "name"),
      type,
      address: str(form, "address"),
      yearBuilt: int(form, "yearBuilt"),
      notes: str(form, "notes"),
    },
  });
  // Smart defaults (proposal §20): start with typical rooms so onboarding is one step shorter.
  if (form.get("seedSpaces") === "on") {
    const withAssets = form.get("seedAssets") === "on";
    for (const t of profileForPropertyType(type, profile).spaces) {
      await createSpaceFromTemplate(property.id, t, withAssets);
    }
  }
  redirect(`/properties/${property.id}`);
}

export async function updateProperty(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  await db.property.update({
    where: { id: propertyId },
    data: {
      name: required(form, "name"),
      type: oneOf(form, "type", PROPERTY_TYPES, "house"),
      address: str(form, "address"),
      yearBuilt: int(form, "yearBuilt"),
      notes: str(form, "notes"),
    },
  });
  revalidatePath(`/properties/${propertyId}`, "layout");
}

export async function deleteProperty(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  const docs = await db.document.findMany({ where: { propertyId }, select: { storageKey: true } });
  await db.property.delete({ where: { id: propertyId } });
  await Promise.all(docs.map((d) => deleteStoredFile(d.storageKey)));
  redirect("/properties");
}

// ── Spaces ──────────────────────────────────────────────────────────────────

export async function createSpace(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  await db.space.create({
    data: {
      propertyId,
      name: required(form, "name"),
      kind: oneOf(form, "kind", SPACE_KINDS, "room"),
      parentId: await resolveSpaceId(form, "parentId", propertyId),
    },
  });
  revalidatePath(`/properties/${propertyId}`);
}

async function createSpaceFromTemplate(propertyId: string, t: SpaceTemplate, withAssets: boolean) {
  const space = await db.space.create({ data: { propertyId, name: t.name, kind: t.kind } });
  if (withAssets) {
    await db.asset.createMany({
      data: t.assets.map((x) => ({
        propertyId,
        spaceId: space.id,
        name: x.name,
        category: x.category,
        expectedLifeYears: x.lifeYears,
      })),
    });
  }
}

/** Templates for the property's own type, so suggestions match what the user picked. */
async function templatesFor(userUseCase: string | null, propertyId: string) {
  const property = await db.property.findUniqueOrThrow({ where: { id: propertyId }, select: { type: true } });
  return profileForPropertyType(property.type, getProfile(userUseCase)).spaces;
}

/** One-click "add a typical room" (optionally with its typical equipment). */
export async function addTemplateSpace(form: FormData) {
  const { user, propertyId } = await ownedProperty(form);
  const templates = await templatesFor(user.useCase, propertyId);
  const t = templates.find((x) => x.name === required(form, "template"));
  if (!t) throw new Error("Unknown room type");
  await createSpaceFromTemplate(propertyId, t, form.get("withAssets") === "on");
  revalidatePath(`/properties/${propertyId}`);
}

/**
 * Adds suggested equipment to a room. Only names from that room's catalogue are
 * accepted, and anything already in the room is skipped.
 */
export async function addSuggestedAssets(form: FormData) {
  const { user, propertyId } = await ownedProperty(form);
  const space = await db.space.findFirst({
    where: { id: required(form, "spaceId"), propertyId },
    include: { assets: { select: { name: true } } },
  });
  if (!space) throw new Error("Space not found");

  const template = templateForSpace(space.name, await templatesFor(user.useCase, propertyId));
  const wanted = new Set(form.getAll("asset").map(String));
  const have = space.assets.map((x) => x.name);
  const toAdd = (template?.assets ?? []).filter((x) => wanted.has(x.name) && !alreadyHas(have, x.name));

  await db.asset.createMany({
    data: toAdd.map((x) => ({
      propertyId,
      spaceId: space.id,
      name: x.name,
      category: x.category,
      expectedLifeYears: x.lifeYears,
    })),
  });
  revalidatePath(`/properties/${propertyId}`);
}

export async function deleteSpace(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  await db.space.deleteMany({ where: { id: required(form, "spaceId"), propertyId } });
  revalidatePath(`/properties/${propertyId}`);
}

// ── Assets ──────────────────────────────────────────────────────────────────

async function assetData(form: FormData, propertyId: string) {
  return {
    name: required(form, "name"),
    category: oneOf(form, "category", ASSET_CATEGORIES, "appliance"),
    status: oneOf(form, "status", ASSET_STATUSES, "active"),
    spaceId: await resolveSpaceId(form, "spaceId", propertyId),
    manufacturer: str(form, "manufacturer"),
    model: str(form, "model"),
    serialNumber: str(form, "serialNumber"),
    purchaseDate: date(form, "purchaseDate"),
    installDate: date(form, "installDate"),
    purchasePrice: float(form, "purchasePrice"),
    expectedLifeYears: int(form, "expectedLifeYears"),
    notes: str(form, "notes"),
  };
}

export async function createAsset(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  const data = await assetData(form, propertyId);
  const asset = await db.asset.create({ data: { ...data, propertyId } });

  const warrantyEnd = date(form, "warrantyEnd");
  if (warrantyEnd) {
    await db.warranty.create({
      data: { assetId: asset.id, startDate: data.purchaseDate, endDate: warrantyEnd },
    });
  }
  if (data.purchasePrice != null && data.purchaseDate) {
    await db.costRecord.create({
      data: {
        propertyId,
        assetId: asset.id,
        amount: data.purchasePrice,
        date: data.purchaseDate,
        category: "purchase",
        description: `Purchase of ${data.name}`,
      },
    });
  }
  redirect(`/properties/${propertyId}/assets/${asset.id}`);
}

export async function updateAsset(form: FormData) {
  const { propertyId, asset } = await ownedAsset(form);
  await db.asset.update({ where: { id: asset.id }, data: await assetData(form, propertyId) });
  revalidatePath(`/properties/${propertyId}`, "layout");
}

export async function deleteAsset(form: FormData) {
  const { propertyId, asset } = await ownedAsset(form);
  await db.asset.delete({ where: { id: asset.id } });
  redirect(`/properties/${propertyId}`);
}

// ── Warranties & costs ──────────────────────────────────────────────────────

export async function addWarranty(form: FormData) {
  const { propertyId, asset } = await ownedAsset(form);
  const endDate = date(form, "endDate");
  if (!endDate) throw new Error("Warranty end date is required");
  await db.warranty.create({
    data: {
      assetId: asset.id,
      provider: str(form, "provider"),
      startDate: date(form, "startDate"),
      endDate,
      terms: str(form, "terms"),
    },
  });
  revalidatePath(`/properties/${propertyId}/assets/${asset.id}`);
}

export async function deleteWarranty(form: FormData) {
  const { propertyId, asset } = await ownedAsset(form);
  await db.warranty.deleteMany({ where: { id: required(form, "warrantyId"), assetId: asset.id } });
  revalidatePath(`/properties/${propertyId}/assets/${asset.id}`);
}

export async function addCost(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  const assetId = await resolveAssetId(form, "assetId", propertyId);
  const amount = float(form, "amount");
  if (amount == null) throw new Error("Amount is required");
  await db.costRecord.create({
    data: {
      propertyId,
      assetId,
      amount,
      date: date(form, "date") ?? new Date(),
      category: oneOf(form, "category", COST_CATEGORIES, "repair"),
      description: str(form, "description"),
    },
  });
  revalidatePath(`/properties/${propertyId}`, "layout");
}

export async function deleteCost(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  await db.costRecord.deleteMany({ where: { id: required(form, "costId"), propertyId } });
  revalidatePath(`/properties/${propertyId}`, "layout");
}
