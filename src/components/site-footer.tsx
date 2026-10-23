import Link from "next/link";

export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span>© {new Date().getFullYear()} Home Digital Twin</span>
        <nav className="flex flex-wrap gap-4">
          {signedIn ? (
            <>
              <Link href="/dashboard" className="hover:text-accent">Dashboard</Link>
              <Link href="/alerts" className="hover:text-accent">Alerts</Link>
              <Link href="/account" className="hover:text-accent">Account</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-accent">Sign in</Link>
              <Link href="/signup" className="hover:text-accent">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
