import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { allProfiles } from "@/lib/profiles";
import { PlacePhoto } from "@/components/photos";
import { chooseUseCase } from "./actions";

export const metadata = { title: "Welcome · DigiMemo" };

export default async function WelcomePage() {
  const user = await requireUser();
  const changing = user.useCase != null;

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="bg-header px-4 pb-24 pt-10 text-center text-header-fg">
        <p className="text-sm text-header-muted">{changing ? "Change what you manage" : `Welcome, ${user.name.split(" ")[0]}`}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">What will you look after?</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-header-muted">
          We&apos;ll set up rooms, suggested equipment, and maintenance tasks to suit it. You can change this later.
        </p>
      </div>

      <form action={chooseUseCase} className="mx-auto -mt-16 grid w-full max-w-5xl gap-4 px-4 pb-12 sm:grid-cols-2 lg:grid-cols-4">
        {allProfiles().map((p) => {
          const selected = user.useCase === p.id;
          return (
            <button
              key={p.id}
              name="useCase"
              value={p.id}
              className={`group flex flex-col overflow-hidden rounded-xl border bg-surface text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md focus-visible:outline-2 focus-visible:outline-accent ${
                selected ? "border-accent ring-2 ring-accent/30" : "border-border"
              }`}
            >
              <PlacePhoto
                kind={p.illustration}
                className="h-44 w-full"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                eager
              />
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.choiceTitle}</span>
                  {selected && <span className="badge bg-ok-bg text-ok">Current</span>}
                </div>
                <span className="text-sm text-muted">{p.choiceDescription}</span>
                <span className="mt-auto pt-3 text-sm font-medium text-accent group-hover:underline">
                  {selected ? "Keep this" : "Choose"} →
                </span>
              </div>
            </button>
          );
        })}
      </form>

      {changing && (
        <p className="pb-10 text-center text-sm">
          <Link href="/dashboard" className="btn-link">Back to dashboard</Link>
        </p>
      )}
    </main>
  );
}
