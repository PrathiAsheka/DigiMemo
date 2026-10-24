"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";

/** Kicks off extraction for a pending document, then refreshes to show the review form. */
export function ExtractionRunner({ documentId, autoStart }: { documentId: string; autoStart: boolean }) {
  const t = useT();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/extract`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? t("documents.extractionFailed"));
      }
    } catch {
      setError(t("documents.networkError"));
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (running) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        {t("documents.reading")}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-secondary" onClick={run}>{autoStart ? t("documents.retry") : t("documents.analyseAi")}</button>
    </div>
  );
}
