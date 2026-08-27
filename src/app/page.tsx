import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createBooking } from "./actions";

const TRAILER_URL =
  "https://www.youtube.com/results?search_query=machya+pidhichi+goshtach+vegali";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const [categories, regions] = await Promise.all([
    prisma.category.findMany({ orderBy: { price: "desc" } }),
    prisma.region.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <header className="space-y-3">
        <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
          <Image
            src="/Drama-Image.jpeg"
            alt="Aamchya Pidhichi Goshtach Vegali - play poster"
            width={1280}
            height={1600}
            className="h-auto w-full"
            priority
          />
        </div>
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Ticket Request</h1>
          <a
            href={TRAILER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium underline"
          >
            Watch trailer on YouTube
          </a>
        </div>
        <p className="text-sm text-black/60 dark:text-white/60">
          Fill this in to request tickets. Requests are handled strictly first-come,
          first-served once the coordinator reviews them.
        </p>
      </header>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Please don&apos;t call the coordinator about your request &mdash; calls aren&apos;t
        being taken. Use{" "}
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
          The portal isn&apos;t configured yet &mdash; no categories or regions found.
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
                  {c.name} &mdash; ₹{c.price}/ticket
                </option>
              ))}
            </select>
          </Field>

          <Field label="Region">
            <select name="regionId" required className="input" defaultValue="">
              <option value="" disabled>
                Select a region
              </option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Number of tickets">
            <input
              name="quantity"
              type="number"
              required
              min={1}
              max={10}
              defaultValue={1}
              className="input"
            />
          </Field>

          <button type="submit" className="btn-primary mt-2">
            Submit request
          </button>

          <p className="text-xs text-black/50 dark:text-white/50">
            You&apos;ll get a booking reference to look up your status. Save it &mdash; you&apos;ll
            need it (with this mobile number) to check on your request and pay.
          </p>
        </form>
      )}

      <footer className="mt-auto pt-6 text-center text-xs text-black/40 dark:text-white/40">
        <Link href="/status" className="underline">
          Already submitted a request? Check status
        </Link>
      </footer>
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
