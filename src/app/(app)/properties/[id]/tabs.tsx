"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Counts = { maintenance: number; workOrders: number; documents: number };

const TABS: { slug: string; label: string; about: string; count?: keyof Counts; tone?: "danger" | "warn" }[] = [
  { slug: "", label: "Overview", about: "Rooms and the equipment in each one." },
  { slug: "/maintenance", label: "Maintenance", about: "Recurring and one-off upkeep. Mark tasks done to log the service and schedule the next one.", count: "maintenance", tone: "danger" },
  { slug: "/work-orders", label: "Work orders", about: "Repairs and jobs: track who is doing them, when, and what they cost.", count: "workOrders", tone: "warn" },
  { slug: "/documents", label: "Documents", about: "Receipts, manuals and warranty cards. Upload one and AI drafts the asset record for you to check.", count: "documents", tone: "warn" },
  { slug: "/costs", label: "Costs", about: "Every purchase, service and repair cost for this property." },
  { slug: "/settings", label: "Settings", about: "Edit or delete this property." },
];

const COUNT_HINT: Record<keyof Counts, string> = {
  maintenance: "overdue",
  workOrders: "open",
  documents: "to review",
};

export function PropertyTabs({ propertyId, counts }: { propertyId: string; counts: Counts }) {
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;
  const isActive = (slug: string) =>
    slug === "" ? pathname === base || pathname.startsWith(`${base}/assets`) : pathname.startsWith(base + slug);
  const current = TABS.find((t) => isActive(t.slug));
  return (
    <div className="space-y-2">
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 text-sm" aria-label="Property sections">
      {TABS.map((t) => {
        const href = base + t.slug;
        const active = isActive(t.slug);
        const n = t.count ? counts[t.count] : 0;
        return (
          <Link
            key={t.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 ${
              active ? "bg-accent font-medium text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {t.label}
            {n > 0 && (
              <span
                title={`${n} ${COUNT_HINT[t.count!]}`}
                className={`min-w-5 rounded-full px-1.5 text-center text-xs font-semibold ${
                  active ? "bg-white/25 text-accent-fg" : t.tone === "danger" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"
                }`}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
    {current && !pathname.startsWith(`${base}/assets/`) && <p className="px-1 text-sm text-muted">{current.about}</p>}
    </div>
  );
}
