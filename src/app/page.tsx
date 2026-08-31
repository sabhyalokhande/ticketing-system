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
      {/* Poster + trailer - left column on desktop, below the form on mobile */}
      <div className="order-2 flex flex-col gap-3 md:order-none md:sticky md:top-10 md:w-[280px] md:shrink-0">
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
      </div>

      {/* Form - right column on desktop, on top on mobile */}
      <div className="order-1 flex w-full min-w-0 max-w-lg flex-col gap-6 md:order-none">
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
              Submit request
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
