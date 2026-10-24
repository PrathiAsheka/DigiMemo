"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_NAMES, type Theme } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { setLanguage, setTheme } from "@/app/preferences-actions";

/** Sun / moon button; switches instantly and remembers the choice. */
export function ThemeToggle({ initial, className = "" }: { initial: Theme; className?: string }) {
  const t = useT();
  const [theme, setLocal] = useState<Theme>(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        setLocal(next);
        void setTheme(next);
      }}
      className={`rounded-md p-1.5 hover:bg-white/10 ${className}`}
      aria-label={next === "dark" ? t("prefs.useDark") : t("prefs.useLight")}
      title={next === "dark" ? t("prefs.useDark") : t("prefs.useLight")}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/** EN / සිං switch. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`flex overflow-hidden rounded-md border border-white/25 text-xs ${className}`} role="group" aria-label={t("prefs.language")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={t.locale === l}
          lang={l}
          onClick={() =>
            start(async () => {
              await setLanguage(l);
              router.refresh();
            })
          }
          className={`px-2 py-1 font-medium ${t.locale === l ? "bg-white/20" : "opacity-75 hover:bg-white/10 hover:opacity-100"}`}
        >
          {l === "en" ? "EN" : "සිං"}
          <span className="sr-only"> {LOCALE_NAMES[l]}</span>
        </button>
      ))}
    </div>
  );
}
