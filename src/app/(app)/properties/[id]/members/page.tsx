import Link from "next/link";
import type { Member } from "@prisma/client";
import { requireProperty } from "@/lib/auth";
import { db } from "@/lib/db";
import { MEMBER_ROLES } from "@/lib/constants";
import { ageInYears, toDateInput } from "@/lib/format";
import { Badge, Empty, Field, Hidden, Input, Select, TextArea } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translator";
import { createMember, deleteMember, updateMember } from "../../member-actions";

/** Shared fields for adding and editing; ids are suffixed so repeated forms stay unique. */
function MemberFields({ t, m }: { t: Translator; m?: Member }) {
  const id = (n: string) => (m ? `${n}-${m.id}` : n);
  return (
    <>
      <Field label={t("common.name")} name="name" id={id("name")}>
        <Input name="name" id={id("name")} required maxLength={100} defaultValue={m?.name ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("members.role")} name="role" id={id("role")}>
          <Select
            name="role"
            id={id("role")}
            options={MEMBER_ROLES}
            emptyLabel={t("members.roleNotSet")}
            defaultValue={m?.role}
            otherPlaceholder={t("members.rolePlaceholder")}
          />
        </Field>
        <Field label={t("members.birthDate")} name="birthDate" id={id("birthDate")}>
          <Input name="birthDate" id={id("birthDate")} type="date" defaultValue={toDateInput(m?.birthDate)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("common.phone")} name="phone" id={id("phone")}>
          <Input name="phone" id={id("phone")} type="tel" defaultValue={m?.phone ?? ""} />
        </Field>
        <Field label={t("common.email")} name="email" id={id("email")}>
          <Input name="email" id={id("email")} type="email" defaultValue={m?.email ?? ""} />
        </Field>
      </div>
      <Field label={t("common.notes")} name="notes" id={id("notes")}>
        <TextArea name="notes" id={id("notes")} rows={2} defaultValue={m?.notes ?? ""} placeholder={t("members.notesPlaceholder")} />
      </Field>
    </>
  );
}

export default async function MembersPage({ params }: PageProps<"/properties/[id]/members">) {
  const { id } = await params;
  const [{ property }, t] = await Promise.all([requireProperty(id), getT()]);

  const [members, shared] = await Promise.all([
    db.member.findMany({
      where: { propertyId: property.id },
      orderBy: [{ createdAt: "asc" }],
      include: { documents: { orderBy: { createdAt: "desc" }, select: { id: true, filename: true, kind: true, createdAt: true } } },
    }),
    db.document.count({ where: { propertyId: property.id, memberId: null, kind: { not: "photo" } } }),
  ]);
  const base = `/properties/${property.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        {members.length === 0 ? (
          <div className="card"><Empty>{t("members.empty")}</Empty></div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {members.map((m) => {
              const age = ageInYears(m.birthDate);
              return (
                <li key={m.id} className="card flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-fg" aria-hidden="true">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{m.name}</div>
                      <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                        {m.role && <span>{t.label(m.role)}</span>}
                        {age != null && <span>· {t("members.age", { count: Math.floor(age) })}</span>}
                      </div>
                    </div>
                  </div>
                  {(m.phone || m.email) && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      {m.phone && <a href={`tel:${m.phone}`} className="btn-secondary py-1.5">📞 {m.phone}</a>}
                      {m.email && <a href={`mailto:${m.email}`} className="btn-secondary py-1.5">✉ {t("common.email")}</a>}
                    </div>
                  )}
                  {m.notes && <p className="text-sm text-muted">{m.notes}</p>}

                  <div className="rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                      <span className="text-sm font-medium">{t("members.documents", { count: m.documents.length })}</span>
                      <Link href={`${base}/documents?member=${m.id}#upload`} className="btn-link text-sm">+ {t("common.add")}</Link>
                    </div>
                    {m.documents.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-muted">{t("members.noDocuments", { name: m.name })}</p>
                    ) : (
                      <ul className="divide-y divide-border text-sm">
                        {m.documents.map((d) => (
                          <li key={d.id} className="flex items-center gap-2 px-3 py-2">
                            <Link href={`${base}/documents/${d.id}`} className="min-w-0 flex-1 truncate hover:underline">{d.filename}</Link>
                            <Badge>{t.label(d.kind)}</Badge>
                            <span className="shrink-0 text-xs text-muted">{t.date(d.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <details className="mt-auto border-t border-border pt-3">
                    <summary className="btn-link cursor-pointer list-none">{t("common.edit")}</summary>
                    <form action={updateMember} className="mt-3 space-y-3">
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="memberId" value={m.id} />
                      <MemberFields t={t} m={m} />
                      <button className="btn">{t("common.save")}</button>
                    </form>
                    <form action={deleteMember} className="mt-3">
                      <Hidden name="propertyId" value={property.id} />
                      <Hidden name="memberId" value={m.id} />
                      <ConfirmButton message={t("members.removeConfirm", { name: m.name })}>{t("members.remove")}</ConfirmButton>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        {shared > 0 && (
          <p className="text-sm text-muted">
            {t("members.sharedDocs", { count: shared })}{" "}
            <Link href={`${base}/documents?member=none`} className="btn-link">{t("common.view")}</Link>
          </p>
        )}
      </section>

      <form action={createMember} className="card space-y-3 self-start">
        <div>
          <h2 className="h2">{t("members.addTitle")}</h2>
          <p className="text-xs text-muted">{t("members.addHint")}</p>
        </div>
        <Hidden name="propertyId" value={property.id} />
        <MemberFields t={t} />
        <button className="btn w-full">{t("members.add")}</button>
      </form>
    </div>
  );
}
