import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { LOGIN_PHOTO, PlacePhoto } from "@/components/photos";
import type { Illustration } from "@/lib/profiles";
import { SiteFooter } from "@/components/site-footer";

const USES: { kind: Illustration; title: string; text: string }[] = [
  { kind: "house", title: "Homes", text: "Appliances, solar, water tanks and the garden: every warranty and service date in one place." },
  { kind: "apartment", title: "Apartments", text: "Know what you maintain and what to report to building management or your landlord." },
  { kind: "office", title: "Businesses", text: "Sites, equipment, contractors, compliance checks and maintenance budgets for your team." },
];

const FEATURES = [
  { icon: "🏠", title: "Rooms and equipment", text: "A structured record of every space and item, with typical equipment suggested for each room." },
  { icon: "🔔", title: "Alerts that matter", text: "Maintenance due, warranties and contracts ending, ageing equipment and urgent jobs, before they become problems." },
  { icon: "🛠", title: "Maintenance schedules", text: "Recurring tasks that roll forward when you mark them done, with the service logged automatically." },
  { icon: "📋", title: "Work orders", text: "Track repairs from reported to fixed: who, when, priority and what it cost." },
  { icon: "📎", title: "Documents", text: "Receipts, manuals, warranty cards and certificates stored with the equipment they belong to." },
  { icon: "📷", title: "Product photos", text: "Snap the item and its rating label so the model and serial are never lost." },
  { icon: "💰", title: "Costs", text: "Every purchase, service and repair, with yearly upkeep and the items costing you most." },
  { icon: "👷", title: "Service providers", text: "Your own list of trusted technicians, with every job they've done for you." },
];

const STEPS = [
  { n: 1, title: "Add your place", text: "Pick home, apartment or business. Typical rooms are set up for you." },
  { n: 2, title: "Add what's in it", text: "One click adds the usual equipment for each room. Add photos, receipts and warranties." },
  { n: 3, title: "Stay ahead", text: "Get reminders, record services and see what needs attention at a glance." },
];

export default async function Home() {
  if (await getSessionUserId()) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <header className="relative overflow-hidden bg-header text-header-fg">
        <Image src={LOGIN_PHOTO} alt="" fill sizes="100vw" placeholder="blur" loading="eager" className="object-cover" style={{ objectPosition: "center 60%" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-header via-header/85 to-header/40" />
        <div className="relative mx-auto max-w-6xl px-4">
          <nav className="flex items-center justify-between py-5">
            <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path d="M3 11 12 4l9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor" />
              </svg>
              Home Digital Twin
            </span>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium hover:bg-white/10">Sign in</Link>
              <Link href="/signup" className="rounded-lg bg-white px-3.5 py-2 font-medium text-header hover:bg-white/90">Get started</Link>
            </div>
          </nav>
          <div className="max-w-xl py-16 sm:py-24">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Know your property. Maintain it before it breaks.
            </h1>
            <p className="mt-4 text-lg text-header-fg/85">
              One place for the equipment, warranties, documents, maintenance and costs of every home, apartment or business you look after.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-lg bg-white px-5 py-3 font-semibold text-header hover:bg-white/90">Create a free account</Link>
              <Link href="/login" className="rounded-lg border border-white/40 px-5 py-3 font-medium hover:bg-white/10">Sign in</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Who it's for */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Made for every kind of place</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted">Choose what you manage when you sign up. Rooms, suggestions and wording adapt to it.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {USES.map((u) => (
              <article key={u.title} className="overflow-hidden rounded-xl border border-border bg-surface">
                <PlacePhoto kind={u.kind} className="h-48 w-full" sizes="(min-width: 768px) 33vw, 100vw" />
                <div className="p-5">
                  <h3 className="h2">{u.title}</h3>
                  <p className="mt-1 text-sm text-muted">{u.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-surface-2/60">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight">Everything about your property, organised</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="card">
                  <div className="text-2xl" aria-hidden="true">{f.icon}</div>
                  <h3 className="mt-2 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">Up and running in minutes</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-fg">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link href="/signup" className="btn px-6 py-3 text-base">Get started, it&apos;s free</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
