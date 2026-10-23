"use server";

import { revalidatePath } from "next/cache";
import { syncAlerts } from "@/lib/alerts";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays } from "@/lib/format";
import { intervalDays, required } from "@/lib/forms";

async function ownAlert(form: FormData) {
  const user = await requireUser();
  const alert = await db.alert.findFirst({ where: { id: required(form, "alertId"), userId: user.id } });
  if (!alert) throw new Error("Alert not found");
  return alert;
}

// Alerts show in the header on every page, so refresh the whole app layout.
const refresh = () => revalidatePath("/", "layout");

export async function markAlertRead(form: FormData) {
  const alert = await ownAlert(form);
  await db.alert.update({ where: { id: alert.id }, data: { readAt: alert.readAt ? null : new Date() } });
  refresh();
}

export async function markAllAlertsRead() {
  const user = await requireUser();
  await db.alert.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  refresh();
}

export async function snoozeAlert(form: FormData) {
  const alert = await ownAlert(form);
  const days = Math.min(Number(form.get("days")) || 7, 90);
  await db.alert.update({ where: { id: alert.id }, data: { snoozedTill: addDays(new Date(), days), readAt: new Date() } });
  refresh();
}

export async function dismissAlert(form: FormData) {
  const alert = await ownAlert(form);
  await db.alert.update({ where: { id: alert.id }, data: { dismissedAt: new Date(), readAt: new Date() } });
  refresh();
}

export async function restoreAlert(form: FormData) {
  const alert = await ownAlert(form);
  await db.alert.update({ where: { id: alert.id }, data: { dismissedAt: null, snoozedTill: null, readAt: null } });
  refresh();
}

export async function updateReminderSettings(form: FormData) {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: {
      remindTaskDays: Math.min(intervalDays(form, "remindTaskDays") ?? 7, 90),
      remindWarrantyDays: Math.min(intervalDays(form, "remindWarrantyDays") ?? 30, 365),
      remindLifeMonths: Math.min(intervalDays(form, "remindLifeMonths") ?? 12, 60),
    },
  });
  // Re-run immediately so the list reflects the new lead times.
  await syncAlerts(user.id, { force: true });
  refresh();
}
