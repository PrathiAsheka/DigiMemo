import Link from "next/link";
import { getT } from "@/i18n/server";

export async function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  const t = await getT();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
        <nav className="flex flex-wrap gap-4">
          {signedIn ? (
            <>
              <Link href="/dashboard" className="hover:text-accent">{t("nav.dashboard")}</Link>
              <Link href="/alerts" className="hover:text-accent">{t("nav.alerts")}</Link>
              <Link href="/account" className="hover:text-accent">{t("nav.account")}</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-accent">{t("nav.signIn")}</Link>
              <Link href="/signup" className="hover:text-accent">{t("nav.createAccount")}</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
