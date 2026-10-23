"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "/documents", label: "Documents" },
  { slug: "/maintenance", label: "Maintenance" },
  { slug: "/work-orders", label: "Work orders" },
  { slug: "/costs", label: "Costs" },
  { slug: "/settings", label: "Settings" },
];

export function PropertyTabs({ propertyId }: { propertyId: string }) {
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;
  return (
    <nav className="-mb-px flex gap-5 overflow-x-auto border-b border-border text-sm">
      {TABS.map((t) => {
        const href = base + t.slug;
        const active = t.slug === "" ? pathname === base || pathname.startsWith(`${base}/assets`) : pathname.startsWith(href);
        return (
          <Link
            key={t.slug}
            href={href}
            className={`whitespace-nowrap border-b-2 pb-2.5 ${
              active ? "border-accent font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
