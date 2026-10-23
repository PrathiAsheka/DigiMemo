"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { required, str } from "@/lib/forms";

export async function createProvider(form: FormData) {
  const user = await requireUser();
  await db.serviceProvider.create({
    data: {
      ownerId: user.id,
      name: required(form, "name"),
      category: str(form, "category"),
      phone: str(form, "phone"),
      email: str(form, "email"),
      notes: str(form, "notes"),
    },
  });
  revalidatePath("/providers");
}

export async function deleteProvider(form: FormData) {
  const user = await requireUser();
  await db.serviceProvider.deleteMany({ where: { id: required(form, "providerId"), ownerId: user.id } });
  revalidatePath("/providers");
}
