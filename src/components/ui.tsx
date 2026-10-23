import { label } from "@/lib/constants";

/** `id` must be passed (to both Field and its control) when a form is repeated on a page. */
export function Field({
  label: text,
  name,
  id,
  children,
  className,
}: {
  label: string;
  name: string;
  id?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={id ?? name}>
        {text}
      </label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return <input id={props.name} className="input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  return <textarea id={props.name} rows={3} className="input" {...props} />;
}

export function Select({
  name,
  id,
  options,
  defaultValue,
  emptyLabel,
}: {
  name: string;
  id?: string;
  options: readonly string[] | { value: string; label: string }[];
  defaultValue?: string | null;
  emptyLabel?: string;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: label(o) } : o));
  return (
    <select id={id ?? name} name={name} className="input" defaultValue={defaultValue ?? ""}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

const TONES: Record<string, string> = {
  ok: "text-ok border-ok/40",
  warn: "text-warn border-warn/40",
  danger: "text-danger border-danger/40",
  muted: "text-muted",
};

export function Badge({ tone = "muted", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}

export function statusTone(status: string): keyof typeof TONES {
  switch (status) {
    case "active":
    case "completed":
      return "ok";
    case "needs_attention":
    case "scheduled":
    case "in_progress":
    case "high":
      return "warn";
    case "out_of_service":
    case "urgent":
      return "danger";
    default:
      return "muted";
  }
}

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="h2">{title}</h2>
      {children}
    </div>
  );
}

export function Stat({ label: text, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium text-muted">{text}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
