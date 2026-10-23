"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ propertiesLabel }: { propertiesLabel: string }) {
  const pathname = usePathname();
  const LINKS = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/properties", label: propertiesLabel },
    { href: "/assistant", label: "Assistant" },
    { href: "/providers", label: "Providers" },
  ];
  return (
    <nav className="flex gap-1 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${
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
