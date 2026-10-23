import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Empty, Field, Hidden, Input, PageHeader, TextArea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { createProvider, deleteProvider, updateProvider } from "./actions";

type ProviderValues = { id?: string; name?: string; category?: string | null; phone?: string | null; email?: string | null; notes?: string | null };

/** Shared fields for adding and editing; ids are suffixed so repeated forms stay unique. */
function ProviderFields({ p = {} }: { p?: ProviderValues }) {
  const id = (n: string) => (p.id ? `${n}-${p.id}` : n);
  return (
    <>
      <Field label="Name" name="name" id={id("name")}><Input name="name" id={id("name")} required defaultValue={p.name ?? ""} /></Field>
      <Field label="Speciality" name="category" id={id("category")}>
        <Input name="category" id={id("category")} placeholder="e.g. HVAC, plumbing" defaultValue={p.category ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" name="phone" id={id("phone")}><Input name="phone" id={id("phone")} type="tel" defaultValue={p.phone ?? ""} /></Field>
        <Field label="Email" name="email" id={id("email")}><Input name="email" id={id("email")} type="email" defaultValue={p.email ?? ""} /></Field>
      </div>
      <Field label="Notes" name="notes" id={id("notes")}><TextArea name="notes" id={id("notes")} rows={2} defaultValue={p.notes ?? ""} /></Field>
    </>
  );
}

export default async function ProvidersPage() {
  const user = await requireUser();
  const providers = await db.serviceProvider.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
    include: {
      workOrders: {
        orderBy: { completedAt: "desc" },
        take: 1,
        where: { status: "completed" },
        include: { asset: { select: { name: true } } },
      },
      _count: { select: { workOrders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service providers"
        description="Your own list of technicians and companies, so you always know who serviced what."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {providers.length === 0 ? (
            <div className="card"><Empty>No providers yet. Add the plumber, electrician or technician you trust.</Empty></div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {providers.map((p) => {
                const last = p.workOrders[0];
                return (
                  <li key={p.id} className="card flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-accent" aria-hidden="true">
                        {p.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-sm text-muted">{p.category ?? "No speciality set"}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {p.phone && <a href={`tel:${p.phone}`} className="btn-secondary py-1.5">📞 {p.phone}</a>}
                      {p.email && <a href={`mailto:${p.email}`} className="btn-secondary py-1.5">✉ Email</a>}
                    </div>
                    {p.notes && <p className="text-sm text-muted">{p.notes}</p>}
                    <p className="text-xs text-muted">
                      {p._count.workOrders} job{p._count.workOrders === 1 ? "" : "s"}
                      {last && ` · last: ${last.title}${last.asset ? ` (${last.asset.name})` : ""}, ${formatDate(last.completedAt)}`}
                    </p>
                    <details className="mt-auto border-t border-border pt-3">
                      <summary className="btn-link cursor-pointer list-none">Edit</summary>
                      <form action={updateProvider} className="mt-3 space-y-3">
                        <Hidden name="providerId" value={p.id} />
                        <ProviderFields p={p} />
                        <div className="flex items-center justify-between">
                          <button className="btn">Save</button>
                        </div>
                      </form>
                      <form action={deleteProvider} className="mt-3">
                        <Hidden name="providerId" value={p.id} />
                        <ConfirmButton message={`Remove ${p.name}? Their past work stays in your history.`}>Remove provider</ConfirmButton>
                      </form>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <form action={createProvider} className="card space-y-3 self-start">
          <h2 className="h2">Add a provider</h2>
          <ProviderFields />
          <button className="btn w-full">Add provider</button>
        </form>
      </div>
    </div>
  );
}
