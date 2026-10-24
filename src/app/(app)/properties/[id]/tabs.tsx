"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

type Counts = { maintenance: number; workOrders: number; documents: number };

const TABS = [
  { slug: "", key: "overview" },
  { slug: "/maintenance", key: "maintenance", count: "maintenance", tone: "danger" },
  { slug: "/work-orders", key: "workOrders", count: "workOrders", tone: "warn" },
  { slug: "/documents", key: "documents", count: "documents", tone: "warn" },
  { slug: "/costs", key: "costs" },
  { slug: "/settings", key: "settings" },
] as const satisfies readonly { slug: string; key: string; count?: keyof Counts; tone?: "danger" | "warn" }[];

export function PropertyTabs({ propertyId, counts }: { propertyId: string; counts: Counts }) {
  const t = useT();
  const pathname = usePathname();
  const base = `/properties/${propertyId}`;
  const isActive = (slug: string) =>
    slug === "" ? pathname === base || pathname.startsWith(`${base}/assets`) : pathname.startsWith(base + slug);
  const current = TABS.find((tab) => isActive(tab.slug));
  return (
    <div className="space-y-2">
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 text-sm" aria-label={t("tabs.sections")}>
        {TABS.map((tab) => {
          const href = base + tab.slug;
          const active = isActive(tab.slug);
          const n = "count" in tab ? counts[tab.count] : 0;
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 ${
                active ? "bg-accent font-medium text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {t(`tabs.${tab.key}`)}
              {n > 0 && "count" in tab && (
                <span
                  title={t(`tabs.${tab.count}Hint`, { count: n })}
                  className={`min-w-5 rounded-full px-1.5 text-center text-xs font-semibold ${
                    active ? "bg-white/25 text-accent-fg" : tab.tone === "danger" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn"
                  }`}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {current && !pathname.startsWith(`${base}/assets/`) && <p className="px-1 text-sm text-muted">{t(`tabs.${current.key}About`)}</p>}
    </div>
  );
}
