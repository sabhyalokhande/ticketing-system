"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createBooking, type BookingFormState } from "@/app/actions";

type Category = { id: string; name: string; price: number };
type Region = { id: string; name: string };

export function BookingForm({
  categories,
  regions,
  previewCode,
}: {
  categories: Category[];
  regions: Region[];
  previewCode?: string;
}) {
  const [state, formAction, isPending] = useActionState<BookingFormState, FormData>(
    createBooking,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [force, setForce] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // "Book another anyway" flips `force`; once the hidden field has re-rendered
  // with value "1", resubmit so the server skips the duplicate check.
  useEffect(() => {
    if (force) formRef.current?.requestSubmit();
  }, [force]);

  const showDuplicate = !!state.duplicate && !force && !dismissed;

  return (
    <>
      {state.error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        {previewCode && <input type="hidden" name="previewCode" value={previewCode} />}
        <input type="hidden" name="allowDuplicate" value={force ? "1" : ""} />

        <Field label="Full Name">
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Your Name"
            className="input"
          />
        </Field>

        <Field label="Mobile Number (WhatsApp number)">
          <input
            name="mobile"
            required
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            title="10-digit WhatsApp number"
            maxLength={10}
            placeholder="10-digit WhatsApp number"
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

        <Field label="Number of Tickets">
          <select name="quantity" required className="input" defaultValue="1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" className="btn-primary mt-2" disabled={isPending}>
          {isPending ? "Submitting…" : "Confirm booking"}
        </button>

        <p className="text-xs text-black/50 dark:text-white/50">
          You&apos;ll get a booking reference to look up your status. Save it &mdash; you&apos;ll
          need it (with this mobile number) to check on your request and pay.
        </p>
      </form>

      {showDuplicate && state.duplicate && (
        <DuplicateDialog
          booking={state.duplicate}
          onBookAnother={() => setForce(true)}
          onClose={() => setDismissed(true)}
        />
      )}
    </>
  );
}

function DuplicateDialog({
  booking,
  onBookAnother,
  onClose,
}: {
  booking: NonNullable<BookingFormState["duplicate"]>;
  onBookAnother: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dup-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-amber-300 bg-white p-5 shadow-xl dark:border-amber-500/40 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
          🎟️
        </div>
        <h2 id="dup-title" className="text-center text-base font-semibold text-black dark:text-white">
          You already have a booking
        </h2>
        <p className="mt-2 text-center text-sm text-black/70 dark:text-white/70">
          We already have a booking under this name / WhatsApp number. No need to book again
          &mdash; you&apos;ll get your allocated seats and payment link within 2 working days on
          WhatsApp.
        </p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
          <dt className="text-black/50 dark:text-white/50">Ref</dt>
          <dd className="font-mono font-medium">{booking.ref}</dd>
          <dt className="text-black/50 dark:text-white/50">Name</dt>
          <dd>{booking.name}</dd>
          <dt className="text-black/50 dark:text-white/50">Category</dt>
          <dd>{booking.category}</dd>
          <dt className="text-black/50 dark:text-white/50">Tickets</dt>
          <dd>{booking.quantity}</dd>
        </dl>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/status?ref=${booking.ref}&mobile=${booking.mobile}`}
            className="btn-primary w-full"
          >
            View my booking
          </Link>
          <button type="button" onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
          <button
            type="button"
            onClick={onBookAnother}
            className="mt-1 text-xs text-black/50 underline hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
          >
            No, I really do want to book more tickets
          </button>
        </div>
      </div>
    </div>
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
