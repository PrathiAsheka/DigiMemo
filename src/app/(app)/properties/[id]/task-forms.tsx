import type { Asset, MaintenanceTask, ServiceProvider } from "@prisma/client";
import { Field, Hidden, Input, Select, TextArea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { relativeDue, daysUntil, toDateInput, formatDate } from "@/lib/format";
import { completeTask, createTask, deleteTask, snoozeTask } from "../maintenance-actions";

const INTERVALS = [
  { value: "", label: "One-off" },
  { value: "30", label: "Monthly" },
  { value: "90", label: "Every 3 months" },
  { value: "180", label: "Every 6 months" },
  { value: "365", label: "Yearly" },
  { value: "730", label: "Every 2 years" },
];

export function intervalLabel(days: number | null) {
  if (!days) return "One-off";
  return INTERVALS.find((i) => i.value === String(days))?.label ?? `Every ${days} days`;
}

export function NewTaskForm({ propertyId, assets, assetId }: { propertyId: string; assets?: Asset[]; assetId?: string }) {
  return (
    <form action={createTask} className="card space-y-3">
      <h2 className="h2">Schedule maintenance</h2>
      <Hidden name="propertyId" value={propertyId} />
      {assetId && <Hidden name="assetId" value={assetId} />}
      <Field label="Task" name="title">
        <Input name="title" required placeholder="e.g. Clean AC filters" />
      </Field>
      {assets && (
        <Field label="Asset" name="assetId">
          <Select name="assetId" emptyLabel="— Whole property" options={assets.map((a) => ({ value: a.id, label: a.name }))} otherPlaceholder="New equipment name" />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repeats" name="intervalDays">
          <Select name="intervalDays" options={INTERVALS} defaultValue="" otherLabel="Other interval…" otherType="number" otherPlaceholder="Repeat every … days" />
        </Field>
        <Field label="Next due" name="nextDueDate">
          <Input name="nextDueDate" type="date" required defaultValue={toDateInput(new Date())} />
        </Field>
      </div>
      <Field label="Details" name="description">
        <TextArea name="description" rows={2} />
      </Field>
      <button className="btn w-full">Add task</button>
    </form>
  );
}

/** One task row with inline complete / snooze / delete controls. */
export function TaskRow({
  task,
  providers,
  assetName,
}: {
  task: MaintenanceTask;
  providers: ServiceProvider[];
  assetName?: string | null;
}) {
  const days = daysUntil(task.nextDueDate);
  const tone = !task.active ? "text-muted" : days < 0 ? "text-danger" : days <= 7 ? "text-warn" : "text-muted";
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium">{task.title}</span>
        {assetName && <span className="text-xs text-muted">{assetName}</span>}
        <span className="text-xs text-muted">{intervalLabel(task.intervalDays)}</span>
        <span className={`ml-auto text-xs ${tone}`}>
          {task.active ? `${formatDate(task.nextDueDate)} · ${relativeDue(task.nextDueDate)}` : `Done ${formatDate(task.lastCompletedAt)}`}
        </span>
      </div>
      {task.description && <p className="mt-1 text-sm text-muted">{task.description}</p>}
      {task.active && (
        <details className="mt-2">
          <summary className="btn-link cursor-pointer list-none">Mark done…</summary>
          <form action={completeTask} className="mt-3 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
            <Hidden name="propertyId" value={task.propertyId} />
            <Hidden name="taskId" value={task.id} />
            <Field label="Completed on" name="completedAt" id={`completedAt-${task.id}`}>
              <Input name="completedAt" id={`completedAt-${task.id}`} type="date" defaultValue={toDateInput(new Date())} />
            </Field>
            <Field label="Cost (USD)" name="cost" id={`cost-${task.id}`}>
              <Input name="cost" id={`cost-${task.id}`} type="number" step="0.01" min={0} />
            </Field>
            <Field label="Done by" name="providerId" id={`providerId-${task.id}`}>
              <Select
                name="providerId"
                id={`providerId-${task.id}`}
                emptyLabel="Myself"
                options={providers.map((p) => ({ value: p.id, label: p.name }))}
              otherPlaceholder="Who did it?" />
            </Field>
            <Field label="Notes" name="notes" id={`notes-${task.id}`}>
              <Input name="notes" id={`notes-${task.id}`} />
            </Field>
            <div className="flex items-center gap-4 sm:col-span-4">
              <button className="btn">Record service</button>
            </div>
          </form>
          <div className="mt-2 flex gap-4">
            <form action={snoozeTask}>
              <Hidden name="propertyId" value={task.propertyId} />
              <Hidden name="taskId" value={task.id} />
              <Hidden name="days" value="7" />
              <button className="btn-link">Snooze a week</button>
            </form>
            <form action={deleteTask}>
              <Hidden name="propertyId" value={task.propertyId} />
              <Hidden name="taskId" value={task.id} />
              <ConfirmButton message={`Delete "${task.title}"?`}>Delete</ConfirmButton>
            </form>
          </div>
        </details>
      )}
    </li>
  );
}
