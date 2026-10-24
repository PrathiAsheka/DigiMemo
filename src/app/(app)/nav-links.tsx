"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { Translator } from "@/i18n/translator";
import { LanguageSwitcher } from "@/components/preferences";

function navLinks(t: Translator, propertiesLabel: string) {
  return [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/properties", label: propertiesLabel },
    { href: "/alerts", label: t("nav.alerts") },
    { href: "/providers", label: t("nav.providers") },
  ];
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Inline navigation for tablets and up. */
export function NavLinks({ propertiesLabel }: { propertiesLabel: string }) {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav className="hidden gap-1 text-sm md:flex" aria-label={t("nav.main")}>
      {navLinks(t, propertiesLabel).map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 ${
              active ? "bg-white/15 font-medium text-header-fg" : "text-header-muted hover:bg-white/10 hover:text-header-fg"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menu button and drop-down panel for phones. */
export function MobileMenu({
  propertiesLabel,
  userName,
  signOut,
}: {
  propertiesLabel: string;
  userName: string;
  signOut: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-header-fg hover:bg-white/10"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
        </svg>
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-50 border-t border-white/10 bg-header px-4 pb-4 shadow-lg">
          <nav className="flex flex-col py-2" aria-label={t("nav.main")}>
            {[...navLinks(t, propertiesLabel), { href: "/account", label: t("nav.account") }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(pathname, l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2.5 text-base ${
                  isActive(pathname, l.href) ? "bg-white/15 font-medium text-header-fg" : "text-header-muted hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 pt-3 text-sm text-header-muted">
            <span className="truncate">{userName}</span>
            <LanguageSwitcher className="sm:hidden" />
            {signOut}
          </div>
        </div>
      )}
    </div>
  );
}
