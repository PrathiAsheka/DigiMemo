"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { USE_CASES } from "@/lib/profiles";
import { oneOf } from "@/lib/forms";

export async function chooseUseCase(form: FormData) {
  const user = await requireUser();
  const useCase = oneOf(form, "useCase", USE_CASES, "home");
  await db.user.update({ where: { id: user.id }, data: { useCase } });
  const hasProperty = await db.property.count({ where: { ownerId: user.id } });
  redirect(hasProperty ? "/dashboard" : "/properties/new");
}
