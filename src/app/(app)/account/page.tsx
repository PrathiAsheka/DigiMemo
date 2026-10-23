import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getProfile } from "@/lib/profiles";
import { PageHeader } from "@/components/ui";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./forms";

export const metadata = { title: "Account · DigiMemo" };

export default async function AccountPage() {
  const user = await requireUser();
  const [record, counts] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true, googleId: true, createdAt: true, remindTaskDays: true, remindWarrantyDays: true, remindLifeMonths: true },
    }),
    Promise.all([
      db.property.count({ where: { ownerId: user.id } }),
      db.asset.count({ where: { property: { ownerId: user.id } } }),
      db.document.count({ where: { property: { ownerId: user.id } } }),
    ]),
  ]);
  const profile = getProfile(user.useCase);
  const methods = [record.passwordHash && "Email and password", record.googleId && "Google"].filter(Boolean).join(" and ");

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description={`Signed in as ${user.email} · member since ${formatDate(record.createdAt)}`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ProfileForm name={user.name} email={user.email} />
          <PasswordForm hasPassword={Boolean(record.passwordHash)} />
          <DeleteAccountForm email={user.email} />
        </div>

        <aside className="space-y-4">
          <div className="card space-y-2 text-sm">
            <h2 className="h2">Your data</h2>
            <p className="text-muted">{counts[0]} {counts[0] === 1 ? profile.noun : profile.nounPlural} · {counts[1]} equipment items · {counts[2]} documents and photos</p>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">What you manage</h2>
            <p className="text-muted">{profile.choiceTitle}. This sets the wording, typical rooms and suggestions.</p>
            <Link href="/welcome" className="btn-link">Change</Link>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">Reminders</h2>
            <p className="text-muted">
              Maintenance {record.remindTaskDays} days ahead · warranties {record.remindWarrantyDays} days ahead · replacement {record.remindLifeMonths} months ahead
            </p>
            <Link href="/alerts" className="btn-link">Change reminder times</Link>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">Sign-in methods</h2>
            <p className="text-muted">{methods || "None"}</p>
            {!record.googleId && <p className="text-xs text-muted">Sign in once with “Continue with Google” using this email to link Google.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
