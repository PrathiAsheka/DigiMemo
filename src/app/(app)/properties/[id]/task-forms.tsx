import type { Asset, MaintenanceTask, ServiceProvider } from "@prisma/client";
import { Field, Hidden, Input, Select, TextArea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { daysUntil, toDateInput } from "@/lib/format";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import { completeTask, createTask, deleteTask, snoozeTask } from "../maintenance-actions";

const INTERVALS = [
  { value: "", key: "tasks.oneOff" },
  { value: "30", key: "tasks.monthly" },
  { value: "90", key: "tasks.every3Months" },
  { value: "180", key: "tasks.every6Months" },
  { value: "365", key: "tasks.yearly" },
  { value: "730", key: "tasks.every2Years" },
] as const;

export function intervalLabel(t: Translator, days: number | null) {
  if (!days) return t("tasks.oneOff");
  const known = INTERVALS.find((i) => i.value === String(days));
  return known ? t(known.key) : t("tasks.everyDays", { count: days });
}

export async function NewTaskForm({ propertyId, assets, assetId }: { propertyId: string; assets?: Asset[]; assetId?: string }) {
  const t = await getT();
  return (
    <form action={createTask} className="card space-y-3">
      <h2 className="h2">{t("tasks.schedule")}</h2>
      <Hidden name="propertyId" value={propertyId} />
      {assetId && <Hidden name="assetId" value={assetId} />}
      <Field label={t("tasks.task")} name="title">
        <Input name="title" required placeholder={t("tasks.taskPlaceholder")} />
      </Field>
      {assets && (
        <Field label={t("common.equipment")} name="assetId">
          <Select
            name="assetId"
            emptyLabel={t("common.wholePropertyOption")}
            options={assets.map((a) => ({ value: a.id, label: a.name }))}
            otherPlaceholder={t("common.newEquipmentName")}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("tasks.repeats")} name="intervalDays">
          <Select
            name="intervalDays"
            options={INTERVALS.map((i) => ({ value: i.value, label: t(i.key) }))}
            defaultValue=""
            otherLabel={t("tasks.otherInterval")}
            otherType="number"
            otherPlaceholder={t("tasks.repeatEveryDays")}
          />
        </Field>
        <Field label={t("tasks.nextDue")} name="nextDueDate">
          <Input name="nextDueDate" type="date" required defaultValue={toDateInput(new Date())} />
        </Field>
      </div>
      <Field label={t("common.details")} name="description">
        <TextArea name="description" rows={2} />
      </Field>
      <button className="btn w-full">{t("tasks.addTask")}</button>
    </form>
  );
}

/** One task row with inline complete / snooze / delete controls. */
export async function TaskRow({
  task,
  providers,
  assetName,
}: {
  task: MaintenanceTask;
  providers: ServiceProvider[];
  assetName?: string | null;
}) {
  const t = await getT();
  const days = daysUntil(task.nextDueDate);
  const tone = !task.active ? "text-muted" : days < 0 ? "text-danger" : days <= 7 ? "text-warn" : "text-muted";
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">{task.title}</span>
        {assetName && <span className="text-xs text-muted">{assetName}</span>}
        <span className="text-xs text-muted">{intervalLabel(t, task.intervalDays)}</span>
        <span className={`ml-auto text-xs ${tone}`}>
          {task.active ? `${t.date(task.nextDueDate)} · ${t.due(task.nextDueDate)}` : t("tasks.done", { date: t.date(task.lastCompletedAt) })}
        </span>
      </div>
      {task.description && <p className="mt-1 text-sm text-muted">{task.description}</p>}
      {task.active && (
        <details className="mt-2">
          <summary className="btn-link cursor-pointer list-none">{t("tasks.markDone")}</summary>
          <form action={completeTask} className="mt-3 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
            <Hidden name="propertyId" value={task.propertyId} />
            <Hidden name="taskId" value={task.id} />
            <Field label={t("tasks.completedOn")} name="completedAt" id={`completedAt-${task.id}`}>
              <Input name="completedAt" id={`completedAt-${task.id}`} type="date" defaultValue={toDateInput(new Date())} />
            </Field>
            <Field label={t("common.costUsd")} name="cost" id={`cost-${task.id}`}>
              <Input name="cost" id={`cost-${task.id}`} type="number" step="0.01" min={0} />
            </Field>
            <Field label={t("tasks.doneBy")} name="providerId" id={`providerId-${task.id}`}>
              <Select
                name="providerId"
                id={`providerId-${task.id}`}
                emptyLabel={t("tasks.myself")}
                options={providers.map((p) => ({ value: p.id, label: p.name }))}
                otherPlaceholder={t("tasks.whoDidIt")}
              />
            </Field>
            <Field label={t("common.notes")} name="notes" id={`notes-${task.id}`}>
              <Input name="notes" id={`notes-${task.id}`} />
            </Field>
            <div className="flex items-center gap-4 sm:col-span-4">
              <button className="btn">{t("tasks.recordService")}</button>
            </div>
          </form>
          <div className="mt-2 flex gap-4">
            <form action={snoozeTask}>
              <Hidden name="propertyId" value={task.propertyId} />
              <Hidden name="taskId" value={task.id} />
              <Hidden name="days" value="7" />
              <button className="btn-link">{t("tasks.snoozeWeek")}</button>
            </form>
            <form action={deleteTask}>
              <Hidden name="propertyId" value={task.propertyId} />
              <Hidden name="taskId" value={task.id} />
              <ConfirmButton message={t("tasks.deleteConfirm", { title: task.title })}>{t("common.delete")}</ConfirmButton>
            </form>
          </div>
        </details>
      )}
    </li>
  );
}
