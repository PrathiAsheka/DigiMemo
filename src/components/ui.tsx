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

// Every dropdown offers "Other…" with a text box (client component).
export { Select } from "./select";

export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

const TONES: Record<string, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  muted: "bg-surface-2 text-muted",
};

/** Page title block: one clear heading, one line saying what the page is for. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h1">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

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

export function Stat({
  label: text,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "danger" | "warn" | "ok";
}) {
  const color = tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="card">
      <div className="text-xs font-medium text-muted">{text}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
