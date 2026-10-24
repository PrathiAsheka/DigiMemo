import Link from "next/link";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("errorPages.notFoundTitle")} · DigiMemo` };
}

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-5xl" aria-hidden="true">🏚</div>
      <h1 className="h1">{t("errorPages.notFoundTitle")}</h1>
      <p className="max-w-md text-muted">{t("errorPages.notFoundText")}</p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="btn">{t("errorPages.goDashboard")}</Link>
        <Link href="/" className="btn-secondary">{t("errorPages.homePage")}</Link>
      </div>
    </main>
  );
}
