"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useT } from "@/i18n/client";

// Shown when a page or action throws. Details go to the browser console, not the screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-5xl" aria-hidden="true">⚠</div>
      <h1 className="h1">{t("errorPages.errorTitle")}</h1>
      <p className="max-w-md text-muted">{t("errorPages.errorText")}</p>
      {error.digest && <p className="font-mono text-xs text-muted">{t("errorPages.reference", { digest: error.digest })}</p>}
      <div className="flex gap-3">
        <button onClick={reset} className="btn">{t("errorPages.tryAgain")}</button>
        <Link href="/dashboard" className="btn-secondary">{t("errorPages.goDashboard")}</Link>
      </div>
    </main>
  );
}
