import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/profiles";
import { PageHeader } from "@/components/ui";
import { LanguageSwitcher, ThemeToggle } from "@/components/preferences";
import { getT, getTheme } from "@/i18n/server";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./forms";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("nav.account")} · DigiMemo` };
}

export default async function AccountPage() {
  const [user, t, theme] = await Promise.all([requireUser(), getT(), getTheme()]);
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
  const profile = getProfile(user.useCase, t.locale);
  const methods = [record.passwordHash && t("account.methodPassword"), record.googleId && "Google"].filter(Boolean).join(t("account.and"));

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.account")} description={t("account.signedInAs", { email: user.email, date: t.date(record.createdAt) })} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <ProfileForm name={user.name} email={user.email} />
          <PasswordForm hasPassword={Boolean(record.passwordHash)} />
          <DeleteAccountForm email={user.email} />
        </div>

        <aside className="space-y-4">
          <div className="card space-y-3 text-sm">
            <div>
              <h2 className="h2">{t("prefs.title")}</h2>
              <p className="text-xs text-muted">{t("prefs.hint")}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("prefs.language")}</span>
              <LanguageSwitcher className="border-border [&_button[aria-pressed=true]]:bg-accent [&_button[aria-pressed=true]]:text-accent-fg" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("prefs.theme")}</span>
              <ThemeToggle initial={theme} className="border border-border hover:bg-surface-2" />
            </div>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">{t("account.yourData")}</h2>
            <p className="text-muted">
              {counts[0]} {counts[0] === 1 ? profile.noun : profile.nounPlural} · {t("properties.assets", { count: counts[1] })} · {t("account.docsPhotos", { count: counts[2] })}
            </p>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">{t("account.whatYouManage")}</h2>
            <p className="text-muted">{t("account.whatYouManageText", { choice: profile.choiceTitle })}</p>
            <Link href="/welcome" className="btn-link">{t("account.change")}</Link>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">{t("account.reminders")}</h2>
            <p className="text-muted">
              {t("account.remindersText", { task: record.remindTaskDays, warranty: record.remindWarrantyDays, life: record.remindLifeMonths })}
            </p>
            <Link href="/alerts" className="btn-link">{t("account.changeReminders")}</Link>
          </div>
          <div className="card space-y-2 text-sm">
            <h2 className="h2">{t("account.signInMethods")}</h2>
            <p className="text-muted">{methods || t("common.none")}</p>
            {!record.googleId && <p className="text-xs text-muted">{t("account.linkGoogle")}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
