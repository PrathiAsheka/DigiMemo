"use server";

import { revalidatePath } from "next/cache";
import { assertOwnsProperty, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MEMBER_ROLES } from "@/lib/constants";
import { date, otherText, required, str } from "@/lib/forms";
import { OTHER } from "@/lib/other";

// Members are the people at a property. Every action re-checks that the user owns it.

async function ownedProperty(form: FormData) {
  const user = await requireUser();
  const propertyId = required(form, "propertyId");
  await assertOwnsProperty(user.id, propertyId);
  return propertyId;
}

/** A listed role, the text typed under "Other…", or nothing. */
function role(form: FormData) {
  const v = str(form, "role");
  if (v === OTHER) return otherText(form, "role")?.slice(0, 60) ?? null;
  return v && (MEMBER_ROLES as readonly string[]).includes(v) ? v : null;
}

function fields(form: FormData) {
  return {
    name: required(form, "name").slice(0, 100),
    role: role(form),
    birthDate: date(form, "birthDate"),
    phone: str(form, "phone"),
    email: str(form, "email"),
    notes: str(form, "notes"),
  };
}

export async function createMember(form: FormData) {
  const propertyId = await ownedProperty(form);
  await db.member.create({ data: { propertyId, ...fields(form) } });
  revalidatePath(`/properties/${propertyId}`, "layout");
}

export async function updateMember(form: FormData) {
  const propertyId = await ownedProperty(form);
  await db.member.updateMany({ where: { id: required(form, "memberId"), propertyId }, data: fields(form) });
  revalidatePath(`/properties/${propertyId}`, "layout");
}

/** Removes the person; their documents stay with the property, no longer linked to anyone. */
export async function deleteMember(form: FormData) {
  const propertyId = await ownedProperty(form);
  await db.member.deleteMany({ where: { id: required(form, "memberId"), propertyId } });
  revalidatePath(`/properties/${propertyId}`, "layout");
}
