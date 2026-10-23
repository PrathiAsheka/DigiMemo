import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Empty, Field, Hidden, Input, TextArea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { createProvider, deleteProvider } from "./actions";

export default async function ProvidersPage() {
  const user = await requireUser();
  const providers = await db.serviceProvider.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
    include: {
      workOrders: { orderBy: { completedAt: "desc" }, take: 1, where: { status: "completed" } },
      _count: { select: { workOrders: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Service providers</h1>
        <p className="mt-1 text-sm text-muted">Your own list of technicians and companies, so you always know who serviced what.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card">
          {providers.length === 0 ? (
            <Empty>No providers yet.</Empty>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Speciality</th><th>Contact</th><th>Jobs</th><th>Last job</th><th /></tr></thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}{p.notes && <div className="text-xs font-normal text-muted">{p.notes}</div>}</td>
                    <td>{p.category ?? "—"}</td>
                    <td className="text-xs">{[p.phone, p.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="tabular-nums">{p._count.workOrders}</td>
                    <td>{formatDate(p.workOrders[0]?.completedAt)}</td>
                    <td className="text-right">
                      <form action={deleteProvider}>
                        <Hidden name="providerId" value={p.id} />
                        <ConfirmButton message={`Remove ${p.name}? Their past work stays in your history.`}>×</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <form action={createProvider} className="card space-y-3 self-start">
          <h2 className="h2">Add a provider</h2>
          <Field label="Name" name="name"><Input name="name" required /></Field>
          <Field label="Speciality" name="category"><Input name="category" placeholder="e.g. HVAC, plumbing" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" name="phone"><Input name="phone" type="tel" /></Field>
            <Field label="Email" name="email"><Input name="email" type="email" /></Field>
          </div>
          <Field label="Notes" name="notes"><TextArea name="notes" rows={2} /></Field>
          <button className="btn w-full">Add provider</button>
        </form>
      </div>
    </div>
  );
}
