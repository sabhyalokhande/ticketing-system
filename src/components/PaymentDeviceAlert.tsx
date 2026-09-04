"use client";

import { useEffect, useState } from "react";

// Pops once when an ALLOCATED booking's status page loads, so the payer
// can't miss that scanning the QR on the same phone won't work.
export function PaymentDeviceAlert() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-device-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-amber-300 bg-white p-5 text-center shadow-xl dark:border-amber-500/40 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950">
          📱
        </div>
        <h2
          id="payment-device-alert-title"
          className="text-base font-semibold text-black dark:text-white"
        >
          Scan from another device
        </h2>
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">
          Scan the QR code from another device for a successful payment. Scanning it on this
          same phone will not work.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-primary mt-4 w-full"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
