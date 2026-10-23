import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";
import { getSessionUserId } from "./session";

export type CurrentUser = { id: string; name: string; email: string };

/** Data Access Layer entry point: resolves the signed-in user or redirects to /login. */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) redirect("/login");
  return user;
});

/** Loads a property only if the current user owns it; 404s otherwise. */
export async function requireProperty(propertyId: string) {
  const user = await requireUser();
  const property = await db.property.findFirst({
    where: { id: propertyId, ownerId: user.id },
  });
  if (!property) notFound();
  return { user, property };
}

/** Ownership check for records reached through a property (assets, tasks, …). */
export async function assertOwnsProperty(userId: string, propertyId: string) {
  const owned = await db.property.count({ where: { id: propertyId, ownerId: userId } });
  if (!owned) notFound();
}
