import Link from "next/link";

export const metadata = { title: "Page not found · DigiMemo" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-5xl" aria-hidden="true">🏚</div>
      <h1 className="h1">Page not found</h1>
      <p className="max-w-md text-muted">
        This page doesn&apos;t exist, or it belongs to a property you don&apos;t have access to.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="btn">Go to dashboard</Link>
        <Link href="/" className="btn-secondary">Home page</Link>
      </div>
    </main>
  );
}
