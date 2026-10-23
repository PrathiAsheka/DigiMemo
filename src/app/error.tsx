"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page or action throws. Details go to the browser console, not the screen.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-5xl" aria-hidden="true">⚠</div>
      <h1 className="h1">Something went wrong</h1>
      <p className="max-w-md text-muted">
        That didn&apos;t work. Your data is safe. Try again, and if it keeps happening, go back and retry in a moment.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted">Reference: {error.digest}</p>}
      <div className="flex gap-3">
        <button onClick={reset} className="btn">Try again</button>
        <Link href="/dashboard" className="btn-secondary">Go to dashboard</Link>
      </div>
    </main>
  );
}
