import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { LOGIN_PHOTO, PlacePhoto } from "@/components/photos";
import type { Illustration } from "@/lib/profiles";
import { SiteFooter } from "@/components/site-footer";
import { LanguageSwitcher, ThemeToggle } from "@/components/preferences";
import { getT, getTheme } from "@/i18n/server";

const USES: { kind: Illustration; key: "Homes" | "Apartments" | "Business" }[] = [
  { kind: "house", key: "Homes" },
  { kind: "apartment", key: "Apartments" },
  { kind: "office", key: "Business" },
];

const FEATURES = [
  { icon: "🏠", n: 1 },
  { icon: "🔔", n: 2 },
  { icon: "🛠", n: 3 },
  { icon: "📋", n: 4 },
  { icon: "📎", n: 5 },
  { icon: "📷", n: 6 },
  { icon: "💰", n: 7 },
  { icon: "👷", n: 8 },
] as const;

const STEPS = [1, 2, 3] as const;

export default async function Home() {
  if (await getSessionUserId()) redirect("/dashboard");
  const [t, theme] = await Promise.all([getT(), getTheme()]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <header className="relative overflow-hidden bg-header text-header-fg">
        <Image src={LOGIN_PHOTO} alt="" fill sizes="100vw" placeholder="blur" loading="eager" className="object-cover" style={{ objectPosition: "center 60%" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-header via-header/85 to-header/40" />
        <div className="relative mx-auto max-w-6xl px-4">
          <nav className="flex flex-wrap items-center justify-between gap-3 py-5">
            <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path d="M3 11 12 4l9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor" />
              </svg>
              DigiMemo
            </span>
            <div className="flex items-center gap-2 text-sm">
              <LanguageSwitcher />
              <ThemeToggle initial={theme} />
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-white/10">{t("nav.signIn")}</Link>
              <Link href="/signup" className="rounded-lg bg-white px-3.5 py-2 font-medium text-header hover:bg-white/90">{t("nav.getStarted")}</Link>
            </div>
          </nav>
          <div className="max-w-xl py-16 sm:py-24">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("landing.heroTitle")}</h1>
            <p className="mt-4 text-lg text-header-fg/85">{t("landing.heroText")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-lg bg-white px-5 py-3 font-semibold text-header hover:bg-white/90">{t("landing.ctaPrimary")}</Link>
              <Link href="/login" className="rounded-lg border border-white/40 px-5 py-3 font-medium hover:bg-white/10">{t("nav.signIn")}</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Who it's for */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">{t("landing.usesTitle")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted">{t("landing.usesText")}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {USES.map((u) => (
              <article key={u.key} className="overflow-hidden rounded-xl border border-border bg-surface">
                <PlacePhoto kind={u.kind} className="h-48 w-full" sizes="(min-width: 768px) 33vw, 100vw" />
                <div className="p-5">
                  <h3 className="h2">{t(`landing.use${u.key}Title`)}</h3>
                  <p className="mt-1 text-sm text-muted">{t(`landing.use${u.key}Text`)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-surface-2/60">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight">{t("landing.featuresTitle")}</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.n} className="card">
                  <div className="text-2xl" aria-hidden="true">{f.icon}</div>
                  <h3 className="mt-2 font-semibold">{t(`landing.f${f.n}Title`)}</h3>
                  <p className="mt-1 text-sm text-muted">{t(`landing.f${f.n}Text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">{t("landing.stepsTitle")}</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((n) => (
              <li key={n} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-fg">{n}</span>
                <div>
                  <h3 className="font-semibold">{t(`landing.s${n}Title`)}</h3>
                  <p className="mt-1 text-sm text-muted">{t(`landing.s${n}Text`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link href="/signup" className="btn px-6 py-3 text-base">{t("landing.ctaBottom")}</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
