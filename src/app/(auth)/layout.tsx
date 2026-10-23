import Image from "next/image";
import Link from "next/link";
import { LOGIN_PHOTO, LOGIN_THUMBS } from "@/components/photos";

const Logo = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
    <path d="M3 11 12 4l9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor" />
  </svg>
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Photo panel */}
      <section className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-header text-header-fg lg:min-h-screen">
        <Image
          src={LOGIN_PHOTO}
          alt="Modern smart home living room with warm lighting"
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          placeholder="blur"
          loading="eager"
          className="object-cover"
          style={{ objectPosition: "center 60%" }}
        />
        {/* Green wash keeps text readable and ties the photo to the theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-header/85 via-header/20 to-header/75" />

        <div className="relative z-10 p-6 lg:p-10">
          <Link href="/" className="flex w-fit items-center gap-2 text-lg font-semibold tracking-tight hover:opacity-90">
            <Logo />
            DigiMemo
          </Link>
          <h2 className="mt-6 max-w-md text-2xl font-semibold leading-tight tracking-tight lg:text-4xl">
            Know your property. Maintain it before it breaks.
          </h2>
          <p className="mt-3 hidden max-w-md text-sm text-header-fg/80 lg:block">
            One place for every home, apartment or business you look after: equipment, warranties, documents, maintenance and costs.
          </p>
        </div>

        <div className="relative z-10 hidden gap-3 p-10 lg:flex">
          {LOGIN_THUMBS.map((t) => (
            <figure key={t.label} className="relative h-28 w-28 overflow-hidden rounded-xl ring-2 ring-white/20">
              <Image src={t.src} alt="" fill sizes="112px" placeholder="blur" className="object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-xs font-medium">
                {t.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-background px-4 py-10">{children}</section>
    </main>
  );
}
