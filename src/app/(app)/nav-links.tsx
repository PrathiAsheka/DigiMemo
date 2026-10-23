"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/assistant", label: "Assistant" },
  { href: "/providers", label: "Providers" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={active ? "font-medium text-foreground" : "text-muted hover:text-foreground"}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
