"use server";

import { revalidatePath } from "next/cache";
import { assertOwnsProperty, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { WORK_ORDER_PRIORITIES, WORK_ORDER_STATUSES } from "@/lib/constants";
import { addDays, startOfDayUTC } from "@/lib/format";
import { date, float, int, oneOf, required, str } from "@/lib/forms";

async function ownedProperty(form: FormData) {
  const user = await requireUser();
  const propertyId = required(form, "propertyId");
  await assertOwnsProperty(user.id, propertyId);
  return { user, propertyId };
}

async function validAssetId(propertyId: string, assetId: string | null) {
  if (!assetId) return null;
  return (await db.asset.count({ where: { id: assetId, propertyId } })) ? assetId : null;
}

async function validProviderId(userId: string, providerId: string | null) {
  if (!providerId) return null;
  return (await db.serviceProvider.count({ where: { id: providerId, ownerId: userId } })) ? providerId : null;
}

function revalidateProperty(propertyId: string) {
  revalidatePath(`/properties/${propertyId}`, "layout");
  revalidatePath("/dashboard");
}

// ── Maintenance tasks ───────────────────────────────────────────────────────

export async function createTask(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  const intervalDays = int(form, "intervalDays");
  await db.maintenanceTask.create({
    data: {
      propertyId,
      assetId: await validAssetId(propertyId, str(form, "assetId")),
      title: required(form, "title"),
      description: str(form, "description"),
      intervalDays: intervalDays && intervalDays > 0 ? intervalDays : null,
      nextDueDate: date(form, "nextDueDate") ?? startOfDayUTC(new Date()),
    },
  });
  revalidateProperty(propertyId);
}

/**
 * Marks a task done: records a completed work order (the service record) and an
 * optional cost, then rolls a recurring task forward or deactivates a one-off.
 */
export async function completeTask(form: FormData) {
  const { user, propertyId } = await ownedProperty(form);
  const task = await db.maintenanceTask.findFirst({
    where: { id: required(form, "taskId"), propertyId },
  });
  if (!task) throw new Error("Task not found");

  const completedAt = date(form, "completedAt") ?? new Date();
  const cost = float(form, "cost");

  await db.$transaction(async (tx) => {
    const wo = await tx.workOrder.create({
      data: {
        propertyId,
        assetId: task.assetId,
        taskId: task.id,
        providerId: await validProviderId(user.id, str(form, "providerId")),
        title: task.title,
        status: "completed",
        completedAt,
        resolution: str(form, "notes"),
      },
    });
    if (cost != null && cost > 0) {
      await tx.costRecord.create({
        data: {
          propertyId,
          assetId: task.assetId,
          workOrderId: wo.id,
          amount: cost,
          date: completedAt,
          category: "service",
          description: task.title,
        },
      });
    }
    await tx.maintenanceTask.update({
      where: { id: task.id },
      data: task.intervalDays
        ? { lastCompletedAt: completedAt, nextDueDate: addDays(startOfDayUTC(completedAt), task.intervalDays) }
        : { lastCompletedAt: completedAt, active: false },
    });
  });
  revalidateProperty(propertyId);
}

export async function snoozeTask(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  const task = await db.maintenanceTask.findFirst({ where: { id: required(form, "taskId"), propertyId } });
  if (!task) throw new Error("Task not found");
  const days = int(form, "days") ?? 7;
  await db.maintenanceTask.update({
    where: { id: task.id },
    data: { nextDueDate: addDays(startOfDayUTC(new Date(Math.max(task.nextDueDate.getTime(), Date.now()))), days) },
  });
  revalidateProperty(propertyId);
}

export async function deleteTask(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  await db.maintenanceTask.deleteMany({ where: { id: required(form, "taskId"), propertyId } });
  revalidateProperty(propertyId);
}

// ── Work orders ─────────────────────────────────────────────────────────────

export async function createWorkOrder(form: FormData) {
  const { user, propertyId } = await ownedProperty(form);
  const scheduledFor = date(form, "scheduledFor");
  const providerId = await validProviderId(user.id, str(form, "providerId"));
  await db.workOrder.create({
    data: {
      propertyId,
      assetId: await validAssetId(propertyId, str(form, "assetId")),
      providerId,
      title: required(form, "title"),
      description: str(form, "description"),
      priority: oneOf(form, "priority", WORK_ORDER_PRIORITIES, "normal"),
      status: scheduledFor || providerId ? "scheduled" : "open",
      scheduledFor,
    },
  });
  revalidateProperty(propertyId);
}

export async function updateWorkOrder(form: FormData) {
  const { user, propertyId } = await ownedProperty(form);
  const wo = await db.workOrder.findFirst({ where: { id: required(form, "workOrderId"), propertyId } });
  if (!wo) throw new Error("Work order not found");

  const status = oneOf(form, "status", WORK_ORDER_STATUSES, wo.status as (typeof WORK_ORDER_STATUSES)[number]);
  const cost = float(form, "cost");
  const completing = status === "completed" && wo.status !== "completed";
  const completedAt = completing ? date(form, "completedAt") ?? new Date() : wo.completedAt;

  await db.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id: wo.id },
      data: {
        status,
        priority: oneOf(form, "priority", WORK_ORDER_PRIORITIES, wo.priority as (typeof WORK_ORDER_PRIORITIES)[number]),
        providerId: form.has("providerId") ? await validProviderId(user.id, str(form, "providerId")) : wo.providerId,
        scheduledFor: form.has("scheduledFor") ? date(form, "scheduledFor") : wo.scheduledFor,
        resolution: str(form, "resolution") ?? wo.resolution,
        completedAt: status === "completed" ? completedAt : null,
      },
    });
    if (cost != null && cost > 0) {
      await tx.costRecord.create({
        data: {
          propertyId,
          assetId: wo.assetId,
          workOrderId: wo.id,
          amount: cost,
          date: completedAt ?? new Date(),
          category: "repair",
          description: wo.title,
        },
      });
    }
  });
  revalidateProperty(propertyId);
}

export async function deleteWorkOrder(form: FormData) {
  const { propertyId } = await ownedProperty(form);
  await db.workOrder.deleteMany({ where: { id: required(form, "workOrderId"), propertyId } });
  revalidateProperty(propertyId);
}
