import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { activeAlertsWhere, syncAlerts, unreadAlertCount } from "@/lib/alerts";
import { db } from "@/lib/db";
import { logout } from "../(auth)/actions";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // First run: ask what the user manages before showing the app.
  if (!user.useCase) redirect("/welcome");
  const profile = getProfile(user.useCase);
  await syncAlerts(user.id);
  const [unread, critical] = await Promise.all([
    unreadAlertCount(user.id),
    db.alert.count({ where: { ...activeAlertsWhere(user.id), severity: "critical" } }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-header text-header-fg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path d="M3 11 12 4l9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor" opacity="0.9" />
            </svg>
            Home Digital Twin
          </Link>
          <NavLinks propertiesLabel={profile.navLabel} />
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link
              href="/alerts"
              className="relative rounded-md p-1.5 text-header-fg hover:bg-white/10"
              aria-label={unread ? `Alerts: ${unread} unread` : "Alerts"}
              title={critical ? `${critical} urgent alert${critical === 1 ? "" : "s"}` : "Alerts"}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
              </svg>
              {unread > 0 && (
                <span
                  className={`absolute -right-1 -top-1 min-w-5 rounded-full px-1 text-center text-[11px] font-bold leading-5 ${
                    critical ? "bg-red-500 text-white" : "bg-amber-400 text-black"
                  }`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link href="/welcome" className="hidden text-header-muted hover:text-header-fg sm:inline" title="Change what you manage">
              {user.name} · {profile.choiceTitle}
            </Link>
            <form action={logout}>
              <button className="font-medium text-header-fg hover:underline">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
