"use client";

import { useState } from "react";

export function SubmittedPopup() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="card w-full max-w-sm bg-white text-center shadow-lg dark:bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-semibold">Thanks for Booking your tickets!</p>
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">
          You&apos;ll get your allocated seats and payment link within 2 working days on your
          WhatsApp number.
        </p>
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => setOpen(false)}>
          Got it
        </button>
      </div>
    </div>
  );
}
