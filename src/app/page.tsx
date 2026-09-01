import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createBooking } from "./actions";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [categories, regions] = await Promise.all([
    prisma.category.findMany({ orderBy: { price: "desc" } }),
    prisma.region.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center gap-8 px-4 py-10 md:flex-row md:items-center md:justify-center">
      {/* Poster + trailer - left column on desktop, on top on mobile */}
      <div className="flex flex-col gap-3 md:sticky md:top-10 md:w-[280px] md:shrink-0">
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100">
          Booking will start from 5th September 2026, 9:00 AM
        </div>

        <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-lg border border-black/10 dark:border-white/15 md:mx-0 md:max-w-none">
          <Image
            src="/Drama-Image.jpeg"
            alt="Aamchya Pidhichi Goshtach Vegali - play poster"
            width={1280}
            height={1600}
            className="h-auto w-full"
            priority
          />
        </div>

        <a
          href="https://youtu.be/-bxvbAdHkYQ?si=ASe1Ic9L37WRgBOF"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
          </svg>
          Watch trailer on YouTube
        </a>

        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-xs dark:border-amber-500 dark:bg-amber-950/40">
          <span className="font-medium text-amber-700 dark:text-amber-400">Date</span>
          <span className="text-amber-950 dark:text-amber-100">Sunday, 25 October 2026</span>
          <span className="font-medium text-amber-700 dark:text-amber-400">Show time</span>
          <span className="text-amber-950 dark:text-amber-100">4:00 PM</span>
          <span className="font-medium text-amber-700 dark:text-amber-400">Venue</span>
          <span className="text-amber-950 dark:text-amber-100">
            Kalidasa Natyamandir, Purushottam Kheraj Road, Near Panch Rasta, Mulund (West),
            Mumbai 400080
          </span>
        </div>

        <a href="#booking-form" className="btn-primary text-center md:hidden">
          Book Tickets Now
        </a>
      </div>

      {/* Form - right column on desktop, below the poster on mobile */}
      <div id="booking-form" className="flex w-full min-w-0 max-w-lg scroll-mt-6 flex-col gap-6">
        <p className="text-sm text-black/60 dark:text-white/60">
          Fill this in to request tickets. Requests are handled strictly first-come,
          first-served basis.
        </p>

        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Please don&apos;t call the coordinators about your request. Use{" "}
          <Link href="/status" className="font-medium underline">
            Check status
          </Link>{" "}
          to track it instead.
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {categories.length === 0 || regions.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            The portal isn&apos;t configured yet &mdash; no categories or residence areas found.
          </p>
        ) : (
          <form action={createBooking} className="flex flex-col gap-4">
            <Field label="Full name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Your name"
                className="input"
              />
            </Field>

            <Field label="Mobile number">
              <input
                name="mobile"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                title="10-digit mobile number"
                maxLength={10}
                placeholder="10-digit mobile number"
                className="input"
              />
            </Field>

            <Field label="Category">
              <select name="categoryId" required className="input" defaultValue="">
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Rs {c.price} per ticket)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Residence Area">
              <select name="regionId" required className="input" defaultValue="">
                <option value="" disabled>
                  Select your residence area
                </option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Number of tickets">
              <select name="quantity" required className="input" defaultValue="1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            <button type="submit" className="btn-primary mt-2">
              Confirm booking
            </button>

            <p className="text-xs text-black/50 dark:text-white/50">
              You&apos;ll get a booking reference to look up your status. Save it &mdash;
              you&apos;ll need it (with this mobile number) to check on your request and pay.
            </p>
          </form>
        )}

        <footer className="pt-2 text-xs text-black/40 dark:text-white/40">
          <Link href="/status" className="underline">
            Already submitted a request? Check status
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
