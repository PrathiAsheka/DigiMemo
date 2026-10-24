import { getT } from "@/i18n/server";

// Skeleton shown while a signed-in page loads.
export default async function Loading() {
  const t = await getT();
  const bar = "animate-pulse rounded-lg bg-surface-2";
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t("common.loading")}>
      <div className="space-y-2">
        <div className={`${bar} h-4 w-40`} />
        <div className={`${bar} h-8 w-72`} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-20`} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${bar} h-64 lg:col-span-2`} />
        <div className={`${bar} h-64`} />
      </div>
    </div>
  );
}
